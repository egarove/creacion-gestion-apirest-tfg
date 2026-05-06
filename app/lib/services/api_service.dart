import 'dart:convert';
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
    Map<String, String> endpoint,
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
