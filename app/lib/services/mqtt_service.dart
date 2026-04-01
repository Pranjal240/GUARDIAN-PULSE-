import 'dart:async';
import 'package:mqtt_client/mqtt_client.dart';
import 'package:mqtt_client/mqtt_server_client.dart';

/// MQTT service for receiving real-time sensor data from Raspberry Pi
/// via HiveMQ Cloud broker. Data is published by sensor_publisher.py.
/// 
/// NOTE: All Firestore writes are done server-side (Cloudflare Worker),
/// not here. This service is for optional direct MQTT monitoring only.
class MqttService {
  static final MqttService _instance = MqttService._internal();
  factory MqttService() => _instance;
  MqttService._internal();

  MqttServerClient? _client;
  bool _isConnected = false;

  bool get isConnected => _isConnected;

  Future<void> initialize() async {
    // MQTT is optional — Firestore is the primary real-time source
    // Only connect if environment variables are available
  }

  Future<void> connect(String userId) async {
    // MQTT direct connection is handled server-side for reliability.
    // Flutter app reads from Firestore (updated by Cloudflare Worker via MQTT in).
    // This stub exists to satisfy the provider import.
    _isConnected = false;
  }

  void disconnect() {
    _client?.disconnect();
    _isConnected = false;
  }
}
