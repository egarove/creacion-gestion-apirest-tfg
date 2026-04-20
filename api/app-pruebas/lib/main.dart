import 'dart:developer';
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;

void main() {
  runApp(const MainApp());
}

class MainApp extends StatelessWidget {
  const MainApp({super.key});

  Future<void> create() async {
    final response = await http.post(
      Uri.parse('http://192.168.1.131:8000/crear-api'),
      headers: {"Content-Type": "application/json"},
      body: jsonEncode({
        "api_name": "pruebas",
        "port": 8081,
        "db": "mariadb",
        "usr": "mariadb",
        "columns": ["name VARCHAR(255)", "age INTEGER"],
        "paswd": "password",
        "endpoints": [
          {
            "method": "get",
            "path": "/",
            "function_name": "read",
            "logic": "select"
          },
          {
            "method": "post",
            "path": "/add",
            "function_name": "add",
            "logic": "insert"
          }
        ]
      }),
    );
    if (response.statusCode == 200) {
      log("¡API generada y corriendo en el puerto 8081!");
    } else {
      log("Error al crear la API ${response.statusCode}: ${response.body}");
    }
  }

  Future<void> delete() async {
    final response = await http.post(
      Uri.parse('http://192.168.1.132:8000/pruebas/delete'),
      headers: {"Content-Type": "application/json"},
    );
    if (response.statusCode == 200) {
      log("¡API eliminada exitosamente!");
    } else {
      log("Error al eliminar la API ${response.statusCode}: ${response.body}");
    }
  }

  Future<void> start() async {
    final response = await http.post(
      Uri.parse('http://192.168.1.132:8000/contenedor-pruebas/start'),
      headers: {"Content-Type": "application/json"},
    );
    if (response.statusCode == 200) {
      log(response.body);
    } else {
      log("Error al eliminar la API ${response.statusCode}: ${response.body}");
    }
  }

  Future<void> stop() async {
    final response = await http.post(
      Uri.parse('http://192.168.1.132:8000/contenedor-pruebas/stop'),
      headers: {"Content-Type": "application/json"},
    );
    if (response.statusCode == 200) {
      log(response.body);
    } else {
      log("Error al eliminar la API ${response.statusCode}: ${response.body}");
    }
  }

  Future<void> status() async {
    final response = await http.post(
      Uri.parse('http://192.168.1.132:8000/contenedor-pruebas/status'),
      headers: {"Content-Type": "application/json"},
    );
    if (response.statusCode == 200) {
      print(response.body);
    } else {
      log("Error al eliminar la API ${response.statusCode}: ${response.body}");
    }
  }

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      debugShowCheckedModeBanner: false,
      home: Scaffold(
        body: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              ElevatedButton(onPressed: start, child: const Text("Crear API")),
              const SizedBox(height: 20),
              ElevatedButton(
                onPressed: status,
                child: const Text("Eliminar API"),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
