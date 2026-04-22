/*
 * ============================================================
 *  IoT Smart Cradle — PRODUCTION FIRMWARE (Ver 1.2)
 * ============================================================
 *  Target: ESP32 DevKit V1
 *  Features:
 *  - High-Confidence Sound Calibration (Peak-to-Peak)
 *  - Secure Cloud Link (HiveMQ SSL)
 *  - Multi-Channel Sync (Serial + MQTT + BLE)
 *  - Non-Blocking State Machine
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

// ─── 1. WiFi & Cloud Setup ────────────────────────────────
const char* WIFI_SSID     = "Loading...";
const char* WIFI_PASSWORD = "sravan21";

const char* MQTT_SERVER   = "d8e2b4a208c149f394a2ce8fa28871e1.s1.eu.hivemq.cloud"; 
const int   MQTT_PORT     = 8883; 
const char* MQTT_USER     = "esp32";
const char* MQTT_PASS     = "Cradle@123";
const char* MQTT_CLIENT   = "SmartCradle_ESP32_Final";

const char* TOPIC_SENSOR  = "cradle/sensors";
const char* TOPIC_COMMAND = "cradle/commands";

// ─── 2. Pin Assignments (IO) ──────────────────────────────
#define DHT_PIN       4   // DHT11 Data
#define DHT_TYPE      DHT11
#define PIR_PIN       12  // Motion Sensor (Safe Pin)
#define SOUND_PIN     34  // Analog Mic (ADC1)
#define MOISTURE_PIN  35  // Soil Moisture (ADC1)
#define SERVO_PIN     13  // Servo Actuator (PWM)

// ─── 3. Thresholds & Constants ────────────────────────────
#define SOUND_MIN_PEAK     200   // Noise floor
#define SOUND_MAX_PEAK     1500  // Trigger floor
#define MOISTURE_THRESHOLD 2800  // Adjust based on your soil sensor
#define TEMP_THRESHOLD     35.0  // Fever threshold
#define PUBLISH_INTERVAL   2000  // 2 Seconds

// ─── 4. Objects & Globals ─────────────────────────────────
DHT dht(DHT_PIN, DHT_TYPE);
Servo cradleServo;
WiFiClientSecure espClient;
PubSubClient mqttClient(espClient);

BLECharacteristic* pTxCharacteristic = NULL;
bool deviceConnected = false;
bool isRocking = false;
unsigned long lastPublish = 0;

// Servo Animation Variables
int servoAngle = 90;
int servoDir = 1;
unsigned long lastServoMove = 0;

// ─────────────────────────────────────────────────────────────
//  Logic: Command Processing
// ─────────────────────────────────────────────────────────────
void processCommand(String cmd) {
  cmd.toLowerCase();
  cmd.trim();
  
  if (cmd.indexOf("rock") != -1) {
    isRocking = true;
    Serial.println("{\"log\":\"Hardware: Rocking STARTED\"}");
  } 
  else if (cmd.indexOf("stop") != -1) {
    isRocking = false;
    cradleServo.write(90); // Reset to center
    Serial.println("{\"log\":\"Hardware: Rocking STOPPED\"}");
  }
}

// ─────────────────────────────────────────────────────────────
//  Logic: Connectivity Handlers
// ─────────────────────────────────────────────────────────────
void mqttCallback(char* topic, byte* payload, unsigned int length) {
  String message = "";
  for (unsigned int i = 0; i < length; i++) message += (char)payload[i];
  processCommand(message);
}

class BLEHandler: public BLECharacteristicCallbacks {
public:
  void onWrite(BLECharacteristic *pChar) {
    std::string value = pChar->getValue();
    if (value.length() > 0) processCommand(String(value.c_str()));
  }
};

class MyServerCallbacks: public BLEServerCallbacks {
public:
  void onConnect(BLEServer* pServer) {
    deviceConnected = true;
  };
  void onDisconnect(BLEServer* pServer) {
    deviceConnected = false;
    pServer->getAdvertising()->start();
  }
};

void syncConnectivity() {
  // 1. MQTT Reconnect logic
  if (WiFi.status() == WL_CONNECTED && !mqttClient.connected()) {
    static unsigned long lastMqttRetry = 0;
    if (millis() - lastMqttRetry > 5000) {
      lastMqttRetry = millis();
      if (mqttClient.connect(MQTT_CLIENT, MQTT_USER, MQTT_PASS)) {
        mqttClient.subscribe(TOPIC_COMMAND);
        Serial.println("{\"log\":\"Cloud: IoT Bridge Connected\"}");
      }
    }
  }
}

// ─────────────────────────────────────────────────────────────
//  Logic: Sensor Analysis
// ─────────────────────────────────────────────────────────────
void readAndTransmit() {
  // A. Sound Peak-to-Peak (Snap 50ms)
  int sMax = 0, sMin = 4095;
  unsigned long start = millis();
  while (millis() - start < 50) {
    int v = analogRead(SOUND_PIN);
    if (v > sMax) sMax = v;
    if (v < sMin) sMin = v;
  }
  int peak = sMax - sMin;
  int soundLvl = map(peak, 0, 1500, 0, 100);
  if (soundLvl > 100) soundLvl = 100;

  // B. DHT Environment
  float temp = dht.readTemperature();
  if (isnan(temp)) { temp = -1.0; dht.begin(); }

  // C. Assemble JSON
  StaticJsonDocument<512> doc;
  static uint32_t hb = 0;
  doc["hb"]          = hb++;
  doc["temperature"] = temp;
  doc["sound"]       = soundLvl;
  doc["moisture"]    = analogRead(MOISTURE_PIN);
  doc["motion"]      = (digitalRead(PIR_PIN) == HIGH);
  doc["isRocking"]   = isRocking;
  doc["isCrying"]    = (soundLvl > 45); 
  doc["isWet"]       = (doc["moisture"].as<int>() < MOISTURE_THRESHOLD); // Lower = Wetter

  // D. Transmit - Serial
  serializeJson(doc, Serial); Serial.println();

  // E. Transmit - MQTT & BLE
  char buffer[512];
  serializeJson(doc, buffer, sizeof(buffer));
  
  if (mqttClient.connected()) mqttClient.publish(TOPIC_SENSOR, buffer);
  if (deviceConnected && pTxCharacteristic) {
    pTxCharacteristic->setValue((uint8_t*)buffer, strlen(buffer));
    pTxCharacteristic->notify();
  }
}

// ─────────────────────────────────────────────────────────────
//  Main Flow
// ─────────────────────────────────────────────────────────────
void setup() {
  Serial.begin(115200);
  Serial.println("\n--- IoT Smart Cradle Final Sync ---");

  dht.begin();
  pinMode(PIR_PIN, INPUT);
  pinMode(SOUND_PIN, INPUT);
  pinMode(MOISTURE_PIN, INPUT);

  cradleServo.setPeriodHertz(50);
  cradleServo.attach(SERVO_PIN, 500, 2400); 
  cradleServo.write(90);

  // Connectivity
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  espClient.setInsecure(); // Required for HiveMQ Cloud
  mqttClient.setServer(MQTT_SERVER, MQTT_PORT);
  mqttClient.setBufferSize(512);
  mqttClient.setCallback(mqttCallback);

  // BLE
  BLEDevice::init("SmartCradle_AI");
  BLEServer *pServer = BLEDevice::createServer();
  pServer->setCallbacks(new MyServerCallbacks());
  BLEService *pService = pServer->createService("4fafc201-1fb5-459e-8fcc-c5c9c331914b");
  pTxCharacteristic = pService->createCharacteristic("beb5483e-36e1-4688-b7f5-ea07361b26a8", BLECharacteristic::PROPERTY_NOTIFY);
  pTxCharacteristic->addDescriptor(new BLE2902());
  BLECharacteristic *pRxChar = pService->createCharacteristic("e3223119-9445-4e96-a4a1-85358ce291d0", BLECharacteristic::PROPERTY_WRITE);
  pRxChar->setCallbacks(new BLEHandler());
  pService->start();
  pServer->getAdvertising()->start();

  Serial.println("{\"log\":\"SYSTEM_READY\", \"hb\":0}");
}

void loop() {
  syncConnectivity();
  mqttClient.loop();

  // 1. Rocking Animation (Non-blocking)
  if (isRocking && (millis() - lastServoMove >= 35)) {
    lastServoMove = millis();
    servoAngle += (servoDir * 5);
    if (servoAngle >= 135) servoDir = -1;
    if (servoAngle <= 45)  servoDir = 1;
    cradleServo.write(servoAngle);
  }

  // 2. Telemetry (USB + Cloud)
  if (millis() - lastPublish >= PUBLISH_INTERVAL) {
    lastPublish = millis();
    readAndTransmit();
  }

  // 3. Serial Control (Inbound)
  if (Serial.available()) {
    String scmd = Serial.readStringUntil('\n');
    processCommand(scmd);
  }
}
