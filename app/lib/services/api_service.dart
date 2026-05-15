import 'dart:convert';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:http/http.dart' as http;

class ApiService {
  static const String _baseUrl = 'https://tfg-dam.libertoguillen.com';

  Future<Map<String, dynamic>> crearApi(Map<String, dynamic> body) async {
    final uri = Uri.parse('$_baseUrl/crear-api');

    try {
      final response = await http.post(
        uri,
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode(body),
      );

      if (response.statusCode == 200 || response.statusCode == 201) {
        return jsonDecode(response.body) as Map<String, dynamic>;
      }

      String mensaje;
      try {
        final decoded = jsonDecode(response.body);
        mensaje = decoded is Map && decoded.containsKey('detail')
            ? decoded['detail'].toString()
            : response.body.isNotEmpty
            ? response.body
            : 'Error del servidor (${response.statusCode})';
      } catch (_) {
        mensaje = response.body.isNotEmpty
            ? response.body
            : 'Error del servidor (${response.statusCode})';
      }
      throw Exception(mensaje);
    } on http.ClientException catch (e) {
      throw Exception('No se pudo conectar al servidor: ${e.message}');
    } catch (e) {
      rethrow;
    }
  }

  Future<void> crearEndpoint(
    String apiName,
    Map<String, dynamic> endpoint,
  ) async {
    final uri = Uri.parse('$_baseUrl/$apiName/create-end-point');

    try {
      final response = await http.post(
        uri,
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode(endpoint),
      );

      if (response.statusCode == 200 || response.statusCode == 201) return;

      String mensaje;
      try {
        final decoded = jsonDecode(response.body);
        mensaje = decoded is Map && decoded.containsKey('detail')
            ? decoded['detail'].toString()
            : response.body.isNotEmpty
            ? response.body
            : 'Error del servidor (${response.statusCode})';
      } catch (_) {
        mensaje = response.body.isNotEmpty
            ? response.body
            : 'Error del servidor (${response.statusCode})';
      }
      throw Exception(mensaje);
    } on http.ClientException catch (e) {
      throw Exception('No se pudo conectar al servidor: ${e.message}');
    } catch (e) {
      rethrow;
    }
  }

  Future<Map<String, dynamic>> getStatus(String apiName) async {
    final uri = Uri.parse('$_baseUrl/$apiName/status');
    try {
      final response = await http.get(uri);
      if (response.statusCode == 200) {
        return jsonDecode(response.body) as Map<String, dynamic>;
      }
      return {'status': 'unknown', 'backup_status': 'unknown'};
    } on http.ClientException {
      return {'status': 'unknown', 'backup_status': 'unknown'};
    } catch (_) {
      return {'status': 'unknown', 'backup_status': 'unknown'};
    }
  }

  Future<Map<String, dynamic>> restoreApi(String apiName) async {
    final uri = Uri.parse('$_baseUrl/$apiName/restore');
    try {
      final response = await http.post(uri);
      if (response.statusCode == 200) {
        return jsonDecode(response.body) as Map<String, dynamic>;
      }
      String mensaje;
      try {
        final decoded = jsonDecode(response.body);
        mensaje = decoded is Map && decoded.containsKey('detail')
            ? decoded['detail'].toString()
            : 'Error al restaurar (${response.statusCode})';
      } catch (_) {
        mensaje = 'Error al restaurar (${response.statusCode})';
      }
      throw Exception(mensaje);
    } on http.ClientException catch (e) {
      throw Exception('No se pudo conectar al servidor: ${e.message}');
    } catch (e) {
      rethrow;
    }
  }

  Future<List<Map<String, dynamic>>> getAllApis() async {
    final uri = Uri.parse('$_baseUrl/get-all-apis');
    try {
      final response = await http.get(uri);
      if (response.statusCode == 200) {
        final list = jsonDecode(response.body) as List;
        return list.map((e) => Map<String, dynamic>.from(e as Map)).toList();
      }
      return [];
    } catch (_) {
      return [];
    }
  }

  /// Ejecuta una petición arbitraria contra un endpoint de una API generada.
  /// Usa el proxy nginx: /app/{apiName}{path} en lugar del puerto directo.
  Future<Map<String, dynamic>> executeRequest({
    required String apiName,
    required String method,
    required String path,
    Map<String, String>? body,
    Map<String, String>? queryParams,
  }) async {
    final cleanPath = path.startsWith('/') ? path : '/$path';
    var uri = Uri.parse('$_baseUrl/app/$apiName$cleanPath');
    if (queryParams != null && queryParams.isNotEmpty) {
      uri = uri.replace(queryParameters: queryParams);
    }

    final user = FirebaseAuth.instance.currentUser;
    final token = user != null ? await user.getIdToken() : null;

    final headers = <String, String>{'Content-Type': 'application/json'};
    if (token != null) headers['Authorization'] = 'Bearer $token';

    http.Response response;

    try {
      switch (method.toUpperCase()) {
        case 'GET':
          response = await http.get(uri, headers: headers);
        case 'POST':
          response = await http.post(uri, headers: headers,
              body: body != null ? jsonEncode(body) : null);
        case 'PUT':
          response = await http.put(uri, headers: headers,
              body: body != null ? jsonEncode(body) : null);
        case 'DELETE':
          response = await http.delete(uri, headers: headers);
        default:
          response = await http.get(uri, headers: headers);
      }

      dynamic data;
      try {
        data = jsonDecode(response.body);
      } catch (_) {
        data = response.body;
      }
      return {'status': response.statusCode, 'data': data};
    } on http.ClientException catch (e) {
      return {'status': 0, 'data': 'Error de conexión: ${e.message}'};
    } catch (e) {
      return {'status': 0, 'data': e.toString()};
    }
  }

  // Returns null on network/server error (don't clean up), empty list if server has 0 APIs
  Future<List<String>?> syncApiNames() async {
    final uri = Uri.parse('$_baseUrl/sync');
    try {
      final response = await http.get(uri);
      if (response.statusCode == 200) {
        final list = jsonDecode(response.body) as List;
        return list.map((e) => (e as Map)['api_name'] as String).toList();
      }
      return null;
    } catch (_) {
      return null;
    }
  }

  Future<void> eliminarApi(String apiName) async {
    final uri = Uri.parse('$_baseUrl/$apiName/delete');

    try {
      final response = await http.post(uri);

      if (response.statusCode != 200 && response.statusCode != 204) {
        String mensaje;
        try {
          final decoded = jsonDecode(response.body);
          mensaje = decoded is Map && decoded.containsKey('detail')
              ? decoded['detail'].toString()
              : 'Error al eliminar la API (${response.statusCode})';
        } catch (_) {
          mensaje = 'Error al eliminar la API (${response.statusCode})';
        }
        throw Exception(mensaje);
      }
    } on http.ClientException catch (e) {
      throw Exception('No se pudo conectar al servidor: ${e.message}');
    } catch (e) {
      rethrow;
    }
  }
}
