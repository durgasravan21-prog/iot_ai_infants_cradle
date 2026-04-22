/*
 * ============================================================
 *  IoT Smart Cradle — ESP32 Firmware
 * ============================================================
 *  Sensors : DHT11, PIR, Sound, Moisture
 *  Actuator: Servo Motor
 *  Comms   : WiFi (MQTT) + BLE (Web Bluetooth)
 * ============================================================
 */

#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <PubSubClient.h>
#include <DHT.h>
#include <ESP32Servo.h>
#include <ArduinoJson.h>
#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLE2902.h>

// ─── WiFi Credentials ──────────────────────────────────────
const char* WIFI_SSID     = "Loading...";
const char* WIFI_PASSWORD = "sravan21";

// ─── MQTT Broker (HiveMQ Cloud Mode) ────────────────────────
const char* MQTT_SERVER   = "d8e2b4a208c149f394a2ce8fa28871e1.s1.eu.hivemq.cloud"; 
const int   MQTT_PORT     = 8883; // HiveMQ Cloud requires 8883 (SSL)
const char* MQTT_USER     = "esp32";
const char* MQTT_PASS     = "Cradle@123";
const char* MQTT_CLIENT   = "SmartCradle_ESP32";
const char* TOPIC_SENSOR  = "cradle/sensors";
const char* TOPIC_COMMAND = "cradle/commands";

// ─── BLE UUIDs ──────────────────────────────────────────────
#define BLE_SERVICE_UUID           "4fafc201-1fb5-459e-8fcc-c5c9c331914b"
#define BLE_CHARACTERISTIC_UUID_TX "beb5483e-36e1-4688-b7f5-ea07361b26a8" // ESP32 -> App (Notify)
#define BLE_CHARACTERISTIC_UUID_RX "e3223119-9445-4e96-a4a1-85358ce291d0" // App -> ESP32 (Write)

// ─── Pin Definitions ───────────────────────────────────────
#define DHT_PIN       4
#define DHT_TYPE      DHT11
#define PIR_PIN       13
#define SOUND_PIN     34
#define MOISTURE_PIN  35
#define SERVO_PIN     18

// ─── Thresholds ─────────────────────────────────────────────
#define SOUND_THRESHOLD    2800
#define MOISTURE_THRESHOLD 2500
#define TEMP_HIGH          35.0

// ─── Objects ────────────────────────────────────────────────
DHT dht(DHT_PIN, DHT_TYPE);
Servo cradleServo;
WiFiClientSecure espClient;
PubSubClient mqttClient(espClient);

BLEServer* pServer = NULL;
BLECharacteristic* pTxCharacteristic = NULL;
bool deviceConnected = false;
bool oldDeviceConnected = false;

// ─── State ──────────────────────────────────────────────────
bool isRocking = false;
unsigned long lastPublish = 0;
const unsigned long PUBLISH_INTERVAL = 2000;

// ─── Servo rocking variables ────────────────────────────────
int   servoAngle    = 90;
int   servoDir      = 1;
unsigned long lastServoMove = 0;
const unsigned long SERVO_STEP_MS = 30;

// ─────────────────────────────────────────────────────────────
//  BLE Callbacks
// ─────────────────────────────────────────────────────────────
class MyServerCallbacks: public BLEServerCallbacks {
    void onConnect(BLEServer* pServer) {
      deviceConnected = true;
      Serial.println("✓ BLE Client Connected");
    };
    void onDisconnect(BLEServer* pServer) {
      deviceConnected = false;
      Serial.println("✗ BLE Client Disconnected");
    }
};

class MyCallbacks: public BLECharacteristicCallbacks {
    void onWrite(BLECharacteristic *pCharacteristic) {
      std::string rxValue = pCharacteristic->getValue();
      if (rxValue.length() > 0) {
        String msg = "";
        for (int i = 0; i < rxValue.length(); i++) {
          msg += rxValue[i];
        }
        
        Serial.print("⟵ BLE Command received: ");
        Serial.println(msg);

        if (msg.indexOf("rock") != -1) {
          isRocking = true;
          Serial.println("  ↻ Cradle rocking STARTED via BLE");
        } 
        else if (msg.indexOf("stop") != -1) {
          isRocking = false;
          cradleServo.write(90);
          Serial.println("  ◼ Cradle rocking STOPPED via BLE");
        }
      }
    }
};

// ─────────────────────────────────────────────────────────────
//  WiFi Connection
// ─────────────────────────────────────────────────────────────
void setupWiFi() {
  delay(100);
  Serial.print("Connecting to ");
  Serial.println(WIFI_SSID);

  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 40) {
    delay(500);
    Serial.print(".");
    attempts++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n✓ WiFi connected");
  } else {
    Serial.println("\n✗ WiFi connection failed");
  }
}

// ─────────────────────────────────────────────────────────────
//  MQTT Callback
// ─────────────────────────────────────────────────────────────
void mqttCallback(char* topic, byte* payload, unsigned int length) {
  String message = "";
  for (unsigned int i = 0; i < length; i++) {
    message += (char)payload[i];
  }

  Serial.print("⟵ MQTT Command received: ");
  Serial.println(message);

  if (message == "rock") {
    isRocking = true;
    Serial.println("  ↻ Cradle rocking STARTED via MQTT");
  } else if (message == "stop") {
    isRocking = false;
    cradleServo.write(90);
    Serial.println("  ◼ Cradle rocking STOPPED via MQTT");
  }
}

// ─────────────────────────────────────────────────────────────
//  MQTT Reconnect
// ─────────────────────────────────────────────────────────────
void reconnectMQTT() {
  if (WiFi.status() != WL_CONNECTED) return;
  
  if (!mqttClient.connected()) {
    Serial.print("Connecting to HiveMQ Cloud...");
    if (mqttClient.connect(MQTT_CLIENT, MQTT_USER, MQTT_PASS)) {
      Serial.println(" ✓ Connected");
      mqttClient.subscribe(TOPIC_COMMAND);
    } else {
      Serial.print(" ✗ failed, rc=");
      Serial.println(mqttClient.state());
    }
  }
}

// ─────────────────────────────────────────────────────────────
//  Servo Rocking Animation
// ─────────────────────────────────────────────────────────────
void updateServo() {
  if (!isRocking) return;

  if (millis() - lastServoMove >= SERVO_STEP_MS) {
    lastServoMove = millis();
    servoAngle += servoDir * 2;

    if (servoAngle >= 140) servoDir = -1;
    if (servoAngle <= 40)  servoDir = 1;

    cradleServo.write(servoAngle);
  }
}

// ─────────────────────────────────────────────────────────────
//  Read Sensors & Publish JSON
// ─────────────────────────────────────────────────────────────
// ... (Sensors read and logic now handled in the optimized readAndPublish at bottom)


// ═════════════════════════════════════════════════════════════
//  SETUP
// ═════════════════════════════════════════════════════════════
void setup() {
  Serial.begin(115200);
  Serial.println("\n--- IoT Smart Cradle Booting ---");

  dht.begin();
  pinMode(PIR_PIN, INPUT);
  pinMode(SOUND_PIN, INPUT);
  pinMode(MOISTURE_PIN, INPUT);

  cradleServo.setPeriodHertz(50);    // standard 50hz servo
  cradleServo.attach(SERVO_PIN, 500, 2400); // Attach with standard pulses
  cradleServo.write(90);

  // --- BLE Setup ---
  BLEDevice::init("SmartCradle"); 
  pServer = BLEDevice::createServer();
  pServer->setCallbacks(new MyServerCallbacks());

  BLEService *pService = pServer->createService(BLE_SERVICE_UUID);

  pTxCharacteristic = pService->createCharacteristic(
                        BLE_CHARACTERISTIC_UUID_TX,
                        BLECharacteristic::PROPERTY_NOTIFY
                      );
  pTxCharacteristic->addDescriptor(new BLE2902());

  BLECharacteristic *pRxCharacteristic = pService->createCharacteristic(
                        BLE_CHARACTERISTIC_UUID_RX,
                        BLECharacteristic::PROPERTY_WRITE
                      );
  pRxCharacteristic->setCallbacks(new MyCallbacks());

  pService->start();

  BLEAdvertising *pAdvertising = BLEDevice::getAdvertising();
  pAdvertising->addServiceUUID(BLE_SERVICE_UUID);
  pAdvertising->setScanResponse(true);
  pAdvertising->setMinPreferred(0x06);  
  pAdvertising->setMinPreferred(0x12);
  BLEDevice::startAdvertising();
  Serial.println("✓ BLE: SmartCradle visible for pairing");

  // --- Network Setup ---
  setupWiFi();
  espClient.setInsecure(); // Required for HiveMQ Cloud SSL without providing Root CA
  mqttClient.setServer(MQTT_SERVER, MQTT_PORT);
  mqttClient.setCallback(mqttCallback);
  mqttClient.setBufferSize(512);

  Serial.println("{\"log\":\"SYSTEM_BOOT_COMPLETE\", \"hb\":0}");
  Serial.println("SYSTEM_READY");
}

// ═════════════════════════════════════════════════════════════
//  LOOP
// ═════════════════════════════════════════════════════════════
// --- Non-Blocking Loop ---
void loop() {
  // BLE & MQTT Connectivity Management
  handleConnectivity();

  // 1. High-Priority: Process Inbound Serial Commands (Rock/Stop)
  processSerialCommands();

  // 2. Middle-Priority: Physical Servo Ticking
  updateServo();

  // 3. Lower-Priority: Read Sensors and Publish JSON (every 2s)
  if (millis() - lastPublish >= PUBLISH_INTERVAL) {
    lastPublish = millis();
    readAndPublish();
  }
}

void handleConnectivity() {
  if (!deviceConnected && oldDeviceConnected) {
    delay(10); // Minimal delay
    pServer->startAdvertising();
    oldDeviceConnected = deviceConnected;
  }
  if (deviceConnected && !oldDeviceConnected) {
    oldDeviceConnected = deviceConnected;
  }

  if (WiFi.status() == WL_CONNECTED && !mqttClient.connected()) {
    reconnectMQTT();
  }
  if (mqttClient.connected()) {
    mqttClient.loop();
  }
}

void processSerialCommands() {
  static String cmdBuffer = "";
  while (Serial.available() > 0) {
    char c = (char)Serial.read();
    if (c == '\n' || c == '\r') {
      cmdBuffer.trim();
      if (cmdBuffer.length() > 0) {
        cmdBuffer.toLowerCase();
        if (cmdBuffer == "rock") {
          isRocking = true;
          Serial.println("{\"log\":\"IoT: Rocking START\"}");
        } else if (cmdBuffer == "stop") {
          isRocking = false;
          cradleServo.write(90);
          Serial.println("{\"log\":\"IoT: Rocking STOP\"}");
        }
      }
      cmdBuffer = "";
    } else {
      cmdBuffer += c;
    }
  }
}

void readAndPublish() {
  static uint32_t heartbeat = 0;
  heartbeat++;

  // Fast Sound Peak Measurement (Non-blocking sampling)
  int signalMax = 0;
  int signalMin = 4095;
  for (int i=0; i<100; i++) { // Snapshot take
    int val = analogRead(SOUND_PIN);
    if (val > signalMax) signalMax = val;
    if (val < signalMin) signalMin = val;
  }
  int soundPercent = map(signalMax - signalMin, 0, 800, 0, 100);
  if (soundPercent > 100) soundPercent = 100;

  float temperature = dht.readTemperature();
  float humidity    = dht.readHumidity();

  if (isnan(temperature)) {
    temperature = -1;
    dht.begin(); // Reset sensor if it hangs
  }
  if (isnan(humidity)) humidity = -1;

  StaticJsonDocument<512> doc;
  doc["hb"]          = heartbeat;
  doc["temperature"] = temperature;
  doc["humidity"]    = humidity;
  doc["sound"]       = soundPercent;
  doc["moisture"]    = analogRead(MOISTURE_PIN);
  doc["motion"]      = (digitalRead(PIR_PIN) == HIGH);
  doc["isCrying"]    = (soundPercent > 40);
  doc["isWet"]       = (doc["moisture"].as<int>() > MOISTURE_THRESHOLD);
  doc["tempAlert"]   = (temperature > TEMP_HIGH && temperature != -1);
  doc["isRocking"]   = isRocking;

  serializeJson(doc, Serial);
  Serial.println();

  if (deviceConnected && pTxCharacteristic != NULL) {
    char buffer[256];
    serializeJson(doc, buffer);
    pTxCharacteristic->setValue((uint8_t*)buffer, strlen(buffer));
    pTxCharacteristic->notify();
  }
}
