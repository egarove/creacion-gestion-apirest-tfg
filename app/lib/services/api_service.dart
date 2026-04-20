import 'dart:convert';
import 'package:http/http.dart' as http;

class ApiService {
  static const String _baseUrl = 'http://192.168.1.132:8000';

  Future<Map<String, dynamic>> crearApi(Map<String, dynamic> body) async {
    final uri = Uri.parse('$_baseUrl/crear-api');

    try {
      final response = await http.post(
        uri,
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode(body),
      );

      final decoded = jsonDecode(response.body);

      if (response.statusCode == 200 || response.statusCode == 201) {
        return decoded as Map<String, dynamic>;
      }

      final mensaje = decoded is Map && decoded.containsKey('detail')
          ? decoded['detail'].toString()
          : 'Error del servidor (${response.statusCode})';
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
