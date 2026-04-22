/*
 * ============================================================
 *  IoT Smart Cradle — FINAL STABLE PRODUCTION FIRMWARE
 * ============================================================
 *  Target: ESP32 DevKit V1
 *  SSID: Loading...
 *  BLE Name: SmartCradle_Final
 * ============================================================
 */

#include <Arduino.h>
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

// ─── 1. Credentials ────────────────────────────────────────
const char* WIFI_SSID     = "Loading...";
const char* WIFI_PASSWORD = "sravan21";

const char* MQTT_SERVER   = "d8e2b4a208c149f394a2ce8fa28871e1.s1.eu.hivemq.cloud"; 
const int   MQTT_PORT     = 8883; 
const char* MQTT_USER     = "esp32";
const char* MQTT_PASS     = "Cradle@123";
const char* MQTT_CLIENT   = "SmartCradle_ESP32_Final";

const char* TOPIC_SENSOR  = "cradle/sensors";
const char* TOPIC_COMMAND = "cradle/commands";

// ─── 2. Pin Definitions ─────────────────────────────────────
#define DHT_PIN       4
#define DHT_TYPE      DHT11
#define PIR_PIN       32  // Fixed: Moved from 12 to 32 to avoid flash error
#define SOUND_PIN     34
#define MOISTURE_PIN  35
#define SERVO_PIN     13

// ─── 3. Global State ────────────────────────────────────────
DHT dht(DHT_PIN, DHT_TYPE);
Servo cradleServo;
WiFiClientSecure espClient;
PubSubClient mqttClient(espClient);

BLECharacteristic* pTxCharacteristic = NULL;
bool deviceConnected = false;
bool isRocking = false;
unsigned long lastPublish = 0;
const int PUBLISH_INTERVAL = 2000;

int servoAngle = 90;
int servoDir = 1;
unsigned long lastServoMove = 0;

// ─── 4. Logic Functions ─────────────────────────────────────

void executeCommand(String cmd) {
  cmd.toLowerCase();
  cmd.trim();
  if (cmd.indexOf("rock") != -1) {
    isRocking = true;
    Serial.println("{\"log\":\"Hardware: Rocking STARTED\"}");
  } else if (cmd.indexOf("stop") != -1) {
    isRocking = false;
    cradleServo.write(90);
    Serial.println("{\"log\":\"Hardware: Rocking STOPPED\"}");
  }
}

// MQTT Handler
void mqttCallback(char* topic, byte* payload, unsigned int length) {
  String message = "";
  for (unsigned int i = 0; i < length; i++) message += (char)payload[i];
  executeCommand(message);
}

// BLE Handlers
class MyServerCallbacks: public BLEServerCallbacks {
    void onConnect(BLEServer* pServer) { deviceConnected = true; }
    void onDisconnect(BLEServer* pServer) {
        deviceConnected = false;
        BLEDevice::getAdvertising()->start();
    }
};

class MyCallbacks: public BLECharacteristicCallbacks {
    void onWrite(BLECharacteristic *pCharacteristic) {
        String value = pCharacteristic->getValue(); // Fixed type mismatch
        if (value.length() > 0) executeCommand(value);
    }
};

// ─── 5. Core Setup ──────────────────────────────────────────

void setup() {
  Serial.begin(115200);
  delay(1000);
  Serial.println("\n--- Starting Smart Cradle System ---");

  dht.begin();
  pinMode(PIR_PIN, INPUT);
  pinMode(SOUND_PIN, INPUT);
  pinMode(MOISTURE_PIN, INPUT);

  cradleServo.setPeriodHertz(50);
  cradleServo.attach(SERVO_PIN, 500, 2400);
  cradleServo.write(90);

  // Connectivity
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  espClient.setInsecure(); // Required for HiveMQ Cloud SSL
  mqttClient.setServer(MQTT_SERVER, MQTT_PORT);
  mqttClient.setCallback(mqttCallback);
  mqttClient.setBufferSize(512);

  // BLE - Renamed to "SmartCradle_Final" to fix GATT 147 errors
  BLEDevice::init("SmartCradle_Final");
  BLEServer *pServer = BLEDevice::createServer();
  pServer->setCallbacks(new MyServerCallbacks());
  BLEService *pService = pServer->createService("4fafc201-1fb5-459e-8fcc-c5c9c331914b");
  
  pTxCharacteristic = pService->createCharacteristic(
                        "beb5483e-36e1-4688-b7f5-ea07361b26a8",
                        BLECharacteristic::PROPERTY_NOTIFY
                      );
  pTxCharacteristic->addDescriptor(new BLE2902());

  BLECharacteristic *pRxCharacteristic = pService->createCharacteristic(
                        "e3223119-9445-4e96-a4a1-85358ce291d0",
                        BLECharacteristic::PROPERTY_WRITE
                      );
  pRxCharacteristic->setCallbacks(new MyCallbacks());

  pService->start();
  pServer->getAdvertising()->start();

  Serial.println("{\"log\":\"SYSTEM_READY\"}");
}

// ─── 6. Main Loop ───────────────────────────────────────────

void loop() {
  // Cloud Reconnect
  if (WiFi.status() == WL_CONNECTED && !mqttClient.connected()) {
    static unsigned long lastMqttRetry = 0;
    if (millis() - lastMqttRetry > 5000) {
      lastMqttRetry = millis();
      if (mqttClient.connect(MQTT_CLIENT, MQTT_USER, MQTT_PASS)) {
        mqttClient.subscribe(TOPIC_COMMAND);
      }
    }
  }
  mqttClient.loop();

  // Servo Animation
  if (isRocking && (millis() - lastServoMove >= 35)) {
    lastServoMove = millis();
    servoAngle += (servoDir * 4);
    if (servoAngle >= 135) servoDir = -1;
    if (servoAngle <= 45)  servoDir = 1;
    cradleServo.write(servoAngle);
  }

  // Sensors & Publishing
  if (millis() - lastPublish >= PUBLISH_INTERVAL) {
    lastPublish = millis();
    
    // Smooth Sound sampling (50ms window)
    int sMax = 0, sMin = 4095;
    unsigned long start = millis();
    while (millis() - start < 50) {
      int v = analogRead(SOUND_PIN);
      if (v > sMax) sMax = v;
      if (v < sMin) sMin = v;
    }
    int soundLvl = map(sMax - sMin, 0, 1500, 0, 100);
    if (soundLvl > 100) soundLvl = 100;

    float t = dht.readTemperature();
    if (isnan(t)) t = -1.0;

    StaticJsonDocument<512> doc;
    doc["temperature"] = t;
    doc["sound"]       = soundLvl;
    doc["moisture"]    = analogRead(MOISTURE_PIN);
    doc["motion"]      = (digitalRead(PIR_PIN) == HIGH);
    doc["isRocking"]   = isRocking;

    // Transmit Serial
    serializeJson(doc, Serial); Serial.println();

    // Transmit Cloud & BLE
    char buffer[512];
    serializeJson(doc, buffer);
    if (mqttClient.connected()) mqttClient.publish(TOPIC_SENSOR, buffer);
    if (pTxCharacteristic) {
      pTxCharacteristic->setValue((uint8_t*)buffer, strlen(buffer));
      pTxCharacteristic->notify();
    }
  }

  // Serial Command Input
  if (Serial.available()) {
    String scmd = Serial.readStringUntil('\n');
    executeCommand(scmd);
  }
}
