import 'dart:convert';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';
import 'package:tfg_2dama_gestion_apirest/services/api_service.dart';
import 'package:tfg_2dama_gestion_apirest/theme/app_theme.dart';

const _bodyMethods = {'POST', 'PUT'};
const _paramMethods = {'GET', 'DELETE'};

class _FilterRow {
  String col;
  final TextEditingController ctrl;
  _FilterRow({required this.col, required this.ctrl});
}

class EndpointTesterScreen extends StatefulWidget {
  const EndpointTesterScreen({super.key});

  @override
  State<EndpointTesterScreen> createState() => _EndpointTesterScreenState();
}

class _EndpointTesterScreenState extends State<EndpointTesterScreen> {
  final _apiService = ApiService();

  List<Map<String, dynamic>> _apis = [];
  bool _loadingApis = true;

  int? _selectedApiIdx;
  int? _selectedEndpointIdx;

  // POST/PUT body fields: column → controller
  final Map<String, TextEditingController> _bodyCtrls = {};
  // GET/DELETE query filters
  final List<_FilterRow> _filterRows = [];

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

  List<String> get _columns =>
      (_selectedApi?['columns'] as List<dynamic>?)
          ?.map((c) => (c as String).split(' ').first)
          .toList() ??
      [];

  List<String> get _filterColumns => ['id', ..._columns];

  @override
  void initState() {
    super.initState();
    _loadApis();
  }

  @override
  void dispose() {
    _clearFields();
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
    final method = (ep['method'] as String? ?? '').toUpperCase();

    if (_bodyMethods.contains(method)) {
      for (final col in _columns) {
        _bodyCtrls[col] = TextEditingController();
      }
    } else {
      final filterCols = _filterColumns;
      if (filterCols.isNotEmpty) {
        _filterRows.add(
          _FilterRow(col: filterCols.first, ctrl: TextEditingController()),
        );
      }
    }
    setState(() {});
  }

  void _clearFields() {
    for (final c in _bodyCtrls.values) c.dispose();
    _bodyCtrls.clear();
    for (final f in _filterRows) f.ctrl.dispose();
    _filterRows.clear();
  }

  void _addFilter() {
    final filterCols = _filterColumns;
    if (filterCols.isEmpty) return;
    setState(() {
      _filterRows.add(
        _FilterRow(col: filterCols.first, ctrl: TextEditingController()),
      );
    });
  }

  void _removeFilter(int i) {
    setState(() {
      _filterRows[i].ctrl.dispose();
      _filterRows.removeAt(i);
    });
  }

  Future<void> _execute() async {
    final api = _selectedApi;
    final ep = _selectedEndpoint;
    if (api == null || ep == null) return;
    setState(() {
      _executing = true;
      _result = null;
    });

    final apiName = api['api_name'] as String? ?? '';
    final method = (ep['method'] as String? ?? 'GET').toUpperCase();
    final path = ep['path'] as String? ?? '/';

    Map<String, String>? body;
    Map<String, String>? queryParams;

    if (_bodyMethods.contains(method)) {
      body = {
        for (final e in _bodyCtrls.entries)
          if (e.value.text.trim().isNotEmpty) e.key: e.value.text.trim(),
      };
    } else {
      queryParams = {
        for (final f in _filterRows)
          if (f.col.isNotEmpty && f.ctrl.text.trim().isNotEmpty)
            f.col: f.ctrl.text.trim(),
      };
    }

    final result = await _apiService.executeRequest(
      apiName: apiName,
      method: method,
      path: path,
      body: body,
      queryParams: queryParams,
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
    final cols = _filterColumns;

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
                  // ── 1. Selecciona API ──
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
                          items: List.generate(_apis.length, (i) {
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
                          }),
                          onChanged: _selectApi,
                        ),

                  if (_selectedApi != null) ...[
                    const SizedBox(height: 20),

                    // ── 2. Selecciona endpoint ──
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
                            items: List.generate(endpoints.length, (i) {
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
                                            epItem['method'] as String? ?? ''),
                                        borderRadius: BorderRadius.circular(4),
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
                            }),
                            onChanged: _selectEndpoint,
                          ),
                  ],

                  if (ep != null) ...[
                    const SizedBox(height: 20),

                    // ── 3. Parámetros / Body ──
                    if (needsBody) ...[
                      _SectionHeader('3. Body (JSON)'),
                      const SizedBox(height: 8),
                      _bodyCtrls.isEmpty
                          ? _emptyFieldsCard()
                          : Card(
                              elevation: 0,
                              color: AppTheme.surfaceColor,
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(12),
                                side: BorderSide(
                                    color: AppTheme.secondaryColor
                                        .withOpacity(0.2)),
                              ),
                              child: Padding(
                                padding: const EdgeInsets.all(16),
                                child: Column(
                                  children: _bodyCtrls.entries
                                      .map((e) => Padding(
                                            padding: const EdgeInsets.only(
                                                bottom: 12),
                                            child: TextFormField(
                                              controller: e.value,
                                              decoration: InputDecoration(
                                                labelText: e.key,
                                                hintText:
                                                    'Contenido de ${e.key}',
                                                suffixIcon: const Tooltip(
                                                  message: 'Campo del body JSON',
                                                  child: Icon(Icons.data_object,
                                                      size: 16),
                                                ),
                                              ),
                                            ),
                                          ))
                                      .toList(),
                                ),
                              ),
                            ),
                    ] else if (needsParams) ...[
                      _SectionHeader('3. Filtros (query params)'),
                      const SizedBox(height: 8),
                      // Filter rows
                      ..._filterRows.asMap().entries.map((entry) {
                        final i = entry.key;
                        final f = entry.value;
                        return Padding(
                          padding: const EdgeInsets.only(bottom: 8),
                          child: Row(
                            children: [
                              // Column selector
                              Container(
                                decoration: BoxDecoration(
                                  color: AppTheme.surfaceColor,
                                  borderRadius: BorderRadius.circular(8),
                                  border: Border.all(
                                      color: AppTheme.secondaryColor
                                          .withOpacity(0.3)),
                                ),
                                padding:
                                    const EdgeInsets.symmetric(horizontal: 8),
                                child: DropdownButton<String>(
                                  value: cols.contains(f.col)
                                      ? f.col
                                      : (cols.isNotEmpty ? cols.first : null),
                                  underline: const SizedBox(),
                                  isDense: true,
                                  items: cols
                                      .map((col) => DropdownMenuItem(
                                            value: col,
                                            child: Text(
                                              col,
                                              style: const TextStyle(
                                                fontSize: 13,
                                                color: AppTheme.primaryColor,
                                              ),
                                            ),
                                          ))
                                      .toList(),
                                  onChanged: (val) {
                                    if (val != null) {
                                      setState(() => f.col = val);
                                    }
                                  },
                                ),
                              ),
                              const SizedBox(width: 8),
                              // Value field
                              Expanded(
                                child: TextFormField(
                                  controller: f.ctrl,
                                  decoration: InputDecoration(
                                    hintText: 'Valor de ${f.col}',
                                    isDense: true,
                                    contentPadding:
                                        const EdgeInsets.symmetric(
                                            horizontal: 12, vertical: 10),
                                  ),
                                ),
                              ),
                              // Remove button
                              IconButton(
                                icon: const Icon(Icons.remove_circle_outline,
                                    color: Colors.red, size: 20),
                                onPressed: _filterRows.length > 1
                                    ? () => _removeFilter(i)
                                    : null,
                                padding: EdgeInsets.zero,
                                constraints: const BoxConstraints(
                                    minWidth: 32, minHeight: 32),
                              ),
                            ],
                          ),
                        );
                      }),
                      TextButton.icon(
                        onPressed: cols.isNotEmpty ? _addFilter : null,
                        icon: const Icon(Icons.add, size: 16),
                        label: const Text(
                          'Añadir filtro',
                          style: TextStyle(fontSize: 13),
                        ),
                        style: TextButton.styleFrom(
                          foregroundColor: AppTheme.primaryColor,
                          padding: const EdgeInsets.symmetric(
                              horizontal: 8, vertical: 4),
                        ),
                      ),
                    ] else ...[
                      _SectionHeader('3. Sin parámetros requeridos'),
                      const SizedBox(height: 8),
                      _emptyFieldsCard(),
                    ],

                    const SizedBox(height: 16),

                    // ── Botón ejecutar ──
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

                  // ── Resultado ──
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

  Widget _emptyFieldsCard() {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: AppTheme.surfaceColor,
        borderRadius: BorderRadius.circular(10),
        border:
            Border.all(color: AppTheme.secondaryColor.withOpacity(0.3)),
      ),
      child: const Text(
        'Sin campos adicionales para este endpoint',
        style: TextStyle(color: AppTheme.secondaryColor, fontSize: 13),
      ),
    );
  }
}

class _ResultPanel extends StatelessWidget {
  const _ResultPanel({required this.result, required this.statusColor});

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
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
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
                  decoration:
                      BoxDecoration(shape: BoxShape.circle, color: color),
                ),
                const SizedBox(width: 8),
                Text(
                  'HTTP $status',
                  style: TextStyle(
                      color: color,
                      fontWeight: FontWeight.bold,
                      fontSize: 14),
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
