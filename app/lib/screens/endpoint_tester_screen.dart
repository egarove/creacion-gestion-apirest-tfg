import 'dart:convert';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';
import 'package:tfg_2dama_gestion_apirest/services/api_service.dart';
import 'package:tfg_2dama_gestion_apirest/theme/app_theme.dart';

const _bodyMethods = {'POST', 'PUT'};
const _paramMethods = {'GET', 'DELETE'};

class EndpointTesterScreen extends StatefulWidget {
  const EndpointTesterScreen({super.key});

  @override
  State<EndpointTesterScreen> createState() => _EndpointTesterScreenState();
}

class _EndpointTesterScreenState extends State<EndpointTesterScreen> {
  final _apiService = ApiService();

  List<Map<String, dynamic>> _apis = [];
  bool _loadingApis = true;

  // Index-based selection avoids Dart Map reference-equality issues in DropdownButton
  int? _selectedApiIdx;
  int? _selectedEndpointIdx;

  final Map<String, TextEditingController> _fieldCtrls = {};
  bool _executing = false;
  Map<String, dynamic>? _result;

  Map<String, dynamic>? get _selectedApi =>
      (_selectedApiIdx != null && _selectedApiIdx! < _apis.length)
          ? _apis[_selectedApiIdx!]
          : null;

  List<Map<String, dynamic>> get _endpoints =>
      (_selectedApi?['endpoints'] as List<dynamic>?)
          ?.map((e) => Map<String, dynamic>.from(e as Map))
          .toList() ??
      [];

  Map<String, dynamic>? get _selectedEndpoint =>
      (_selectedEndpointIdx != null && _selectedEndpointIdx! < _endpoints.length)
          ? _endpoints[_selectedEndpointIdx!]
          : null;

  @override
  void initState() {
    super.initState();
    _loadApis();
  }

  @override
  void dispose() {
    for (final c in _fieldCtrls.values) {
      c.dispose();
    }
    super.dispose();
  }

  Future<void> _loadApis() async {
    setState(() => _loadingApis = true);

    final uid = FirebaseAuth.instance.currentUser?.uid;
    if (uid == null) {
      setState(() => _loadingApis = false);
      return;
    }

    final userDoc = await FirebaseFirestore.instance
        .collection('usuarios')
        .doc(uid)
        .get();
    final isAdmin = userDoc.data()?['role'] == 'admin';

    List<Map<String, dynamic>> apis;

    if (isAdmin) {
      apis = await _apiService.getAllApis();
    } else {
      final snapshot = await FirebaseFirestore.instance
          .collection('usuarios')
          .doc(uid)
          .collection('apis')
          .get();

      apis = snapshot.docs.map((doc) {
        final data = doc.data();
        return <String, dynamic>{
          'api_name': data['api_name'] as String? ?? '',
          'port': data['port'] ?? 0,
          'backup_port': data['backup_port'],
          'db': data['db'] as String? ?? '',
          'columns':
              (data['columns'] as List<dynamic>?)?.cast<String>() ?? [],
          'endpoints': (data['endpoints'] as List<dynamic>?)
                  ?.map((e) => Map<String, dynamic>.from(e as Map))
                  .toList() ??
              [],
          'status': 'unknown',
        };
      }).toList();

      // Check running status for each API
      for (final api in apis) {
        try {
          final s = await _apiService.getStatus(api['api_name'] as String);
          api['status'] = s['status'] ?? 'unknown';
        } catch (_) {}
      }
    }

    _clearFields();
    setState(() {
      _apis = apis;
      _selectedApiIdx = null;
      _selectedEndpointIdx = null;
      _result = null;
      _loadingApis = false;
    });
  }

  void _selectApi(int? idx) {
    _clearFields();
    setState(() {
      _selectedApiIdx = idx;
      _selectedEndpointIdx = null;
      _result = null;
    });
  }

  void _selectEndpoint(int? idx) {
    _clearFields();
    setState(() {
      _selectedEndpointIdx = idx;
      _result = null;
    });
    if (idx == null) return;
    final ep = _endpoints[idx];
    final columns = (_selectedApi?['columns'] as List<dynamic>?)
            ?.map((c) => (c as String).split(' ').first)
            .toList() ??
        [];
    final method = (ep['method'] as String? ?? '').toUpperCase();
    final fields = _bodyMethods.contains(method) ? columns : ['id'];
    for (final f in fields) {
      _fieldCtrls[f] = TextEditingController();
    }
    setState(() {});
  }

  void _clearFields() {
    for (final c in _fieldCtrls.values) {
      c.dispose();
    }
    _fieldCtrls.clear();
  }

  Future<void> _execute() async {
    final api = _selectedApi;
    final ep = _selectedEndpoint;
    if (api == null || ep == null) return;
    setState(() {
      _executing = true;
      _result = null;
    });

    final port = api['port'] as int? ?? 0;
    final method = (ep['method'] as String? ?? 'GET').toUpperCase();
    final path = ep['path'] as String? ?? '/';

    final Map<String, String> fields = {
      for (final e in _fieldCtrls.entries)
        if (e.value.text.trim().isNotEmpty) e.key: e.value.text.trim()
    };

    final result = await _apiService.executeRequest(
      port: port,
      method: method,
      path: path,
      body: _bodyMethods.contains(method) ? fields : null,
      queryParams: _paramMethods.contains(method) ? fields : null,
    );

    setState(() {
      _result = result;
      _executing = false;
    });
  }

  Color _statusColor(int? status) {
    if (status == null || status == 0) return Colors.grey;
    if (status < 300) return const Color(0xFF4CAF50);
    if (status < 400) return Colors.orange;
    return Colors.red;
  }

  Color _methodColor(String method) {
    switch (method.toLowerCase()) {
      case 'get':
        return const Color(0xFF4CAF50);
      case 'post':
        return const Color(0xFF2196F3);
      case 'put':
        return const Color(0xFFFF9800);
      case 'delete':
        return const Color(0xFFF44336);
      default:
        return AppTheme.secondaryColor;
    }
  }

  @override
  Widget build(BuildContext context) {
    final endpoints = _endpoints;
    final ep = _selectedEndpoint;
    final method = (ep?['method'] as String? ?? '').toUpperCase();
    final needsBody = _bodyMethods.contains(method);
    final needsParams = _paramMethods.contains(method);

    return Scaffold(
      appBar: AppBar(
        title: const Text(
          'Laboratorio de Endpoints',
          style: TextStyle(
            color: AppTheme.primaryColor,
            fontWeight: FontWeight.bold,
          ),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            tooltip: 'Recargar APIs',
            onPressed: _loadApis,
          ),
        ],
      ),
      body: _loadingApis
          ? const Center(child: CircularProgressIndicator())
          : SingleChildScrollView(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // ── SELECCIÓN DE API ──
                  _SectionHeader('1. Selecciona una API'),
                  const SizedBox(height: 8),
                  _apis.isEmpty
                      ? const Text(
                          'No tienes APIs disponibles.',
                          style: TextStyle(color: AppTheme.secondaryColor),
                        )
                      : DropdownButtonFormField<int>(
                          value: _selectedApiIdx,
                          decoration: const InputDecoration(
                            labelText: 'API',
                            hintText: 'Selecciona una API',
                          ),
                          items: List.generate(
                            _apis.length,
                            (i) {
                              final api = _apis[i];
                              return DropdownMenuItem<int>(
                                value: i,
                                child: Row(
                                  children: [
                                    Container(
                                      width: 8,
                                      height: 8,
                                      decoration: BoxDecoration(
                                        shape: BoxShape.circle,
                                        color: api['status'] == 'running'
                                            ? const Color(0xFF4CAF50)
                                            : Colors.red,
                                      ),
                                    ),
                                    const SizedBox(width: 8),
                                    Text(api['api_name'] as String? ?? ''),
                                    const SizedBox(width: 6),
                                    Text(
                                      ':${api['port']}',
                                      style: const TextStyle(
                                        color: AppTheme.secondaryColor,
                                        fontSize: 12,
                                      ),
                                    ),
                                  ],
                                ),
                              );
                            },
                          ),
                          onChanged: _selectApi,
                        ),

                  if (_selectedApi != null) ...[
                    const SizedBox(height: 20),

                    // ── SELECCIÓN DE ENDPOINT ──
                    _SectionHeader('2. Selecciona un endpoint'),
                    const SizedBox(height: 8),
                    endpoints.isEmpty
                        ? const Text(
                            'Esta API no tiene endpoints definidos.',
                            style: TextStyle(color: AppTheme.secondaryColor),
                          )
                        : DropdownButtonFormField<int>(
                            value: _selectedEndpointIdx,
                            decoration: const InputDecoration(
                              labelText: 'Endpoint',
                              hintText: 'Selecciona un endpoint',
                            ),
                            items: List.generate(
                              endpoints.length,
                              (i) {
                                final epItem = endpoints[i];
                                return DropdownMenuItem<int>(
                                  value: i,
                                  child: Row(
                                    children: [
                                      Container(
                                        padding: const EdgeInsets.symmetric(
                                            horizontal: 6, vertical: 2),
                                        decoration: BoxDecoration(
                                          color: _methodColor(
                                              epItem['method'] as String? ??
                                                  ''),
                                          borderRadius:
                                              BorderRadius.circular(4),
                                        ),
                                        child: Text(
                                          (epItem['method'] as String? ?? '')
                                              .toUpperCase(),
                                          style: const TextStyle(
                                            color: Colors.white,
                                            fontSize: 10,
                                            fontWeight: FontWeight.bold,
                                          ),
                                        ),
                                      ),
                                      const SizedBox(width: 8),
                                      Text(epItem['path'] as String? ?? ''),
                                    ],
                                  ),
                                );
                              },
                            ),
                            onChanged: _selectEndpoint,
                          ),
                  ],

                  if (ep != null) ...[
                    const SizedBox(height: 20),

                    // ── FORMULARIO DINÁMICO ──
                    _SectionHeader(
                      needsBody
                          ? '3. Body (JSON)'
                          : needsParams
                              ? '3. Parámetros'
                              : '3. Sin parámetros requeridos',
                    ),
                    const SizedBox(height: 8),

                    if (_fieldCtrls.isEmpty)
                      Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: AppTheme.surfaceColor,
                          borderRadius: BorderRadius.circular(10),
                          border: Border.all(
                              color: AppTheme.secondaryColor.withOpacity(0.3)),
                        ),
                        child: const Text(
                          'Sin campos adicionales para este endpoint',
                          style: TextStyle(
                            color: AppTheme.secondaryColor,
                            fontSize: 13,
                          ),
                        ),
                      )
                    else
                      Card(
                        elevation: 0,
                        color: AppTheme.surfaceColor,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                          side: BorderSide(
                              color: AppTheme.secondaryColor.withOpacity(0.2)),
                        ),
                        child: Padding(
                          padding: const EdgeInsets.all(16),
                          child: Column(
                            children: _fieldCtrls.entries
                                .map(
                                  (e) => Padding(
                                    padding:
                                        const EdgeInsets.only(bottom: 12),
                                    child: TextFormField(
                                      controller: e.value,
                                      decoration: InputDecoration(
                                        labelText: e.key,
                                        hintText: needsParams
                                            ? 'Valor para ${e.key}'
                                            : 'Contenido de ${e.key}',
                                        suffixIcon: needsBody
                                            ? const Tooltip(
                                                message: 'Campo del body JSON',
                                                child: Icon(
                                                  Icons.data_object,
                                                  size: 16,
                                                ),
                                              )
                                            : const Tooltip(
                                                message: 'Query parameter',
                                                child: Icon(
                                                  Icons.link,
                                                  size: 16,
                                                ),
                                              ),
                                      ),
                                    ),
                                  ),
                                )
                                .toList(),
                          ),
                        ),
                      ),

                    const SizedBox(height: 16),

                    // ── BOTÓN EJECUTAR ──
                    SizedBox(
                      width: double.infinity,
                      height: 52,
                      child: _executing
                          ? const Center(child: CircularProgressIndicator())
                          : ElevatedButton.icon(
                              onPressed: _execute,
                              icon: const Icon(Icons.send),
                              label: Text(
                                'Ejecutar $method ${ep['path']}',
                                style: const TextStyle(
                                    fontWeight: FontWeight.bold),
                              ),
                              style: ElevatedButton.styleFrom(
                                backgroundColor: _methodColor(method),
                                foregroundColor: Colors.white,
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(10),
                                ),
                              ),
                            ),
                    ),
                  ],

                  // ── RESULTADO ──
                  if (_result != null) ...[
                    const SizedBox(height: 24),
                    _SectionHeader('Resultado'),
                    const SizedBox(height: 8),
                    _ResultPanel(result: _result!, statusColor: _statusColor),
                  ],

                  const SizedBox(height: 32),
                ],
              ),
            ),
    );
  }
}

class _ResultPanel extends StatelessWidget {
  const _ResultPanel({
    required this.result,
    required this.statusColor,
  });

  final Map<String, dynamic> result;
  final Color Function(int?) statusColor;

  @override
  Widget build(BuildContext context) {
    final status = result['status'] as int? ?? 0;
    final data = result['data'];
    final color = statusColor(status);

    String prettyJson;
    try {
      prettyJson = const JsonEncoder.withIndent('  ').convert(data);
    } catch (_) {
      prettyJson = data.toString();
    }

    return Card(
      elevation: 2,
      color: AppTheme.surfaceColor,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: BorderSide(color: color.withOpacity(0.4), width: 1.5),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding:
                const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
            decoration: BoxDecoration(
              color: color.withOpacity(0.1),
              borderRadius:
                  const BorderRadius.vertical(top: Radius.circular(12)),
            ),
            child: Row(
              children: [
                Container(
                  width: 10,
                  height: 10,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: color,
                  ),
                ),
                const SizedBox(width: 8),
                Text(
                  'HTTP $status',
                  style: TextStyle(
                    color: color,
                    fontWeight: FontWeight.bold,
                    fontSize: 14,
                  ),
                ),
                const Spacer(),
                if (status > 0)
                  Text(
                    status < 300
                        ? 'Éxito'
                        : status < 400
                            ? 'Redirección'
                            : status < 500
                                ? 'Error cliente'
                                : 'Error servidor',
                    style: TextStyle(color: color, fontSize: 12),
                  ),
              ],
            ),
          ),
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(16),
            child: SelectableText(
              prettyJson,
              style: const TextStyle(
                fontFamily: 'monospace',
                fontSize: 12,
                color: AppTheme.primaryColor,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _SectionHeader extends StatelessWidget {
  const _SectionHeader(this.text);
  final String text;

  @override
  Widget build(BuildContext context) {
    return Text(
      text,
      style: const TextStyle(
        fontSize: 14,
        fontWeight: FontWeight.bold,
        color: AppTheme.primaryColor,
      ),
    );
  }
}
