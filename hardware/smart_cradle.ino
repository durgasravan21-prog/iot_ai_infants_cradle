/*
 * ============================================================
 *  IoT Smart Cradle — ULTIMATE MASTER FIRMWARE (Ver 1.7)
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
#include <time.h>

// ─── 1. Credentials ────────────────────────────────────────
const char* WIFI_SSID     = "Loading...";
const char* WIFI_PASSWORD = "sravan21";

const char* MQTT_SERVER   = "d8e2b4a208c149f394a2ce8fa28871e1.s1.eu.hivemq.cloud"; 
const int   MQTT_PORT     = 8883; 
const char* MQTT_USER     = "cradle_user";
const char* MQTT_PASS     = "Cradle@123";

// ─── 2. Pin Assignments ─────────────────────────────────────
#define DHT_PIN       4
#define DHT_TYPE      DHT11
#define PIR_PIN       32
#define SOUND_PIN     34
#define MOISTURE_PIN  35
#define SERVO_PIN     18 // Moved from 13 to 18 for better stability

// ─── 3. Objects & Globals ───────────────────────────────────
DHT dht(DHT_PIN, DHT_TYPE);
Servo cradleServo;
WiFiClientSecure espClient;
PubSubClient mqttClient(espClient);

BLECharacteristic* pTxCharacteristic = NULL;
bool deviceConnected = false;
bool isRocking = false;
unsigned long lastPublish = 0;
bool confirmedCrying = false;
unsigned long cryTimer = 0;
unsigned long lastMove = 0;
int angle = 90;
int direction = 1;

// ─── 4. Functions ───────────────────────────────────────────

void executeCommand(String cmd) {
  cmd.toLowerCase(); cmd.trim();
  if (cmd.indexOf("rock") != -1) {
    isRocking = true;
    Serial.println("{\"log\":\"CMD: Rocking Signal Sent to Pin 18\"}");
  } else if (cmd.indexOf("stop") != -1) {
    isRocking = false;
    cradleServo.write(90);
    Serial.println("{\"log\":\"CMD: Rocking Stopped\"}");
  }
}

void mqttCallback(char* topic, byte* payload, unsigned int length) {
  String message = "";
  for (unsigned int i = 0; i < length; i++) message += (char)payload[i];
  executeCommand(message);
}

class MyCallbacks: public BLECharacteristicCallbacks {
    void onWrite(BLECharacteristic *p) { 
      String v = p->getValue(); 
      if (v.length() > 0) executeCommand(v); 
    }
};

class MyServerCallbacks: public BLEServerCallbacks {
    void onConnect(BLEServer* p) { deviceConnected = true; }
    void onDisconnect(BLEServer* p) { 
        deviceConnected = false; 
        BLEDevice::startAdvertising(); 
    }
};

void syncConnectivity() {
  if (WiFi.status() == WL_CONNECTED) {
    // --- NTP Time Sync (Required for Secure Cloud Connection) ---
    if (time(nullptr) < 100000) {
       configTime(19800, 0, "pool.ntp.org", "time.google.com"); 
       Serial.println("{\"log\":\"Cloud: Syncing Time...\"}");
       return; 
    }

    if (!mqttClient.connected()) {
      static unsigned long lastM = 0;
      if (millis() - lastM > 5000) {
        lastM = millis();
        String clientID = "Cradle_" + String(random(0, 9999));
        Serial.println("{\"log\":\"Cloud: Connecting to HiveMQ...\"}");

        if (mqttClient.connect(clientID.c_str(), MQTT_USER, MQTT_PASS)) {
          mqttClient.subscribe("cradle/commands");
          Serial.println("{\"log\":\"Cloud: LIVE ✅\"}");
        }
      }
    }
  } else {
    static unsigned long lastW = 0;
    if (millis() - lastW > 5000) {
      lastW = millis();
      Serial.println("{\"log\":\"WiFi: Searching...\"}");
      WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
    }
  }
}

// ─── 5. Core Flow ───────────────────────────────────────────

void setup() {
  Serial.begin(115200);
  delay(1000);
  Serial.println("\n--- MASTER VERSION 1.7 START ---");
  
  dht.begin();
  pinMode(PIR_PIN, INPUT); pinMode(SOUND_PIN, INPUT); pinMode(MOISTURE_PIN, INPUT);
  cradleServo.attach(SERVO_PIN, 500, 2400); // Standard pulse range for SG90/MG90S
  cradleServo.write(90); // Start at neutral

  // Connectivity
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  espClient.setInsecure();
  espClient.setHandshakeTimeout(30000); // 30s for slow hotspots
  mqttClient.setServer(MQTT_SERVER, MQTT_PORT);
  mqttClient.setCallback(mqttCallback);
  mqttClient.setBufferSize(512); // Handle larger JSON packets if needed

  // Bluetooth
  BLEDevice::init("Cradle_AI");
  BLEServer *pServer = BLEDevice::createServer();
  pServer->setCallbacks(new MyServerCallbacks());
  BLEService *pService = pServer->createService("4fafc201-1fb5-459e-8fcc-c5c9c331914b");
  pTxCharacteristic = pService->createCharacteristic("beb5483e-36e1-4688-b7f5-ea07361b26a8", BLECharacteristic::PROPERTY_NOTIFY);
  pTxCharacteristic->addDescriptor(new BLE2902());
  BLECharacteristic *pRxChar = pService->createCharacteristic("e3223119-9445-4e96-a4a1-85358ce291d0", BLECharacteristic::PROPERTY_WRITE);
  pRxChar->setCallbacks(new MyCallbacks());
  pService->start();
  pServer->getAdvertising()->start();

  Serial.println("{\"log\":\"SYSTEM_READY\"}");
}

void loop() {
  syncConnectivity();
  mqttClient.loop();
  
  // --- MIC LOGIC: 10-Second Verification ---
  int soundLevel = map(analogRead(SOUND_PIN), 0, 4095, 0, 100);
  if (soundLevel > 40) { // Threshold for crying
    if (!currentlyCrying) {
      currentlyCrying = true;
      cryingStartTime = millis();
    } else if (millis() - cryingStartTime > 10000) { // 10 seconds constant
      confirmedCrying = true;
    }
  } else {
    currentlyCrying = false;
    confirmedCrying = false;
  }

  // --- LIQUID-SMOOTH CRADLE MOTION ---
  if (isRocking) {
    if (millis() - lastMove > 15) { // 15ms = Higher speed, smoother swing
      lastMove = millis();
      angle += (direction * 2); 
      if (angle >= 135 || angle <= 45) direction *= -1; 
      cradleServo.write(angle);
    }
  } else {
    if (angle != 90) { angle = 90; cradleServo.write(angle); }
  }

  // Telemetry Send (Slower: Every 5 Seconds)
  if (millis() - lastPublish > 5000) {
    lastPublish = millis();
    StaticJsonDocument<256> doc;
    doc["temperature"] = dht.readTemperature();
    doc["humidity"]    = dht.readHumidity();
    doc["sound"]       = soundLevel;
    doc["isCrying"]    = confirmedCrying;
    doc["moisture"]    = analogRead(MOISTURE_PIN);
    doc["isWet"]       = (analogRead(MOISTURE_PIN) < 2000); // Trigger logic in hardware
    doc["motion"]      = (digitalRead(PIR_PIN) == HIGH);
    doc["isRocking"]   = isRocking;
    doc["hb"]          = millis() / 1000;

    char buf[256];
    serializeJson(doc, buf);
    serializeJson(doc, Serial); Serial.println(); 
    
    if (mqttClient.connected()) mqttClient.publish("cradle/sensors", buf);
    if (deviceConnected && pTxCharacteristic) {
      pTxCharacteristic->setValue(buf); pTxCharacteristic->notify();
    }
  }

  // Serial Command
  if (Serial.available()) {
    String scmd = Serial.readStringUntil('\n');
    executeCommand(scmd);
  }
}
