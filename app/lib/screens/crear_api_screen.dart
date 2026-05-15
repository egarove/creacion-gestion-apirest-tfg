import 'package:flutter/material.dart';
import 'package:tfg_2dama_gestion_apirest/services/api_service.dart';
import 'package:tfg_2dama_gestion_apirest/services/login_singup_methods.dart';
import 'package:tfg_2dama_gestion_apirest/theme/app_theme.dart';

class _ColumnEntry {
  final TextEditingController nameCtrl = TextEditingController();
  String type = 'VARCHAR(255)';

  void dispose() => nameCtrl.dispose();
}

class _ExtraTableEntry {
  final TextEditingController nameCtrl = TextEditingController();
  final List<_ColumnEntry> columns = [_ColumnEntry()];

  void dispose() {
    nameCtrl.dispose();
    for (final c in columns) {
      c.dispose();
    }
  }
}

class _EndpointEntry {
  String method = 'get';
  final TextEditingController pathCtrl = TextEditingController();
  final TextEditingController funcCtrl = TextEditingController();
  String? selectedTable;
  String logic = 'select';
  bool isPublic = false;

  void dispose() {
    pathCtrl.dispose();
    funcCtrl.dispose();
  }
}

class CrearApiScreen extends StatefulWidget {
  const CrearApiScreen({super.key});

  @override
  State<CrearApiScreen> createState() => _CrearApiScreenState();
}

class _CrearApiScreenState extends State<CrearApiScreen> {
  final _formKey = GlobalKey<FormState>();

  final _nameCtrl = TextEditingController();
  final _portCtrl = TextEditingController();

  String _dbType = 'postgresql';
  final _dbUserCtrl = TextEditingController();
  final _dbPassCtrl = TextEditingController();
  bool _viewPass = true;

  String _language = 'python';

  final List<_ColumnEntry> _columns = [_ColumnEntry()];
  final List<_ExtraTableEntry> _extraTables = [];
  final List<_EndpointEntry> _endpoints = [_EndpointEntry()];

  bool _isLoading = false;
  bool _generarUi = false;
  String? _errorMsg;

  static const List<String> _colTypes = [
    'VARCHAR(255)',
    'INTEGER',
    'BOOLEAN',
    'TEXT',
    'FLOAT',
    'DATE',
  ];

  static const Map<String, String> _dbOptions = {
    'postgresql': 'PostgreSQL',
    'mariadb': 'MariaDB',
    'mysql': 'MySQL',
    'sqlite': 'SQLite',
  };

  static const Map<String, String> _languageOptions = {
    'python': 'Python',
    'typescript': 'TypeScript',
    'go': 'Go',
    'rust': 'Rust',
    'java': 'Java',
    'c': 'C',
    'cpp': 'C++',
  };

  static const List<String> _methods = ['get', 'post', 'put', 'delete'];
  static const List<String> _logics = ['select', 'insert', 'update', 'delete'];

  static const Map<String, List<String>> _strictMatrix = {
    'get':    ['select'],
    'post':   ['insert'],
    'put':    ['update'],
    'delete': ['update', 'delete'],
  };

  static String _defaultLogic(String method) =>
      (_strictMatrix[method] ?? ['select']).first;

  List<MapEntry<String, String>> get _availableDbOptions {
    final invalidForSqlite = ['go', 'rust', 'c'];
    return _dbOptions.entries.where((e) {
      if (e.key == 'sqlite' && invalidForSqlite.contains(_language)) {
        return false;
      }
      return true;
    }).toList();
  }

  List<String?> get _tableOptions {
    final extras = _extraTables
        .map((t) => t.nameCtrl.text.trim())
        .where((n) => n.isNotEmpty)
        .toList();
    return [null, ...extras];
  }

  @override
  void dispose() {
    _nameCtrl.dispose();
    _portCtrl.dispose();
    _dbUserCtrl.dispose();
    _dbPassCtrl.dispose();
    for (final c in _columns) c.dispose();
    for (final t in _extraTables) t.dispose();
    for (final e in _endpoints) e.dispose();
    super.dispose();
  }

  void _removeExtraTable(int i) {
    final removedName = _extraTables[i].nameCtrl.text.trim();
    setState(() {
      _extraTables[i].dispose();
      _extraTables.removeAt(i);
      for (final ep in _endpoints) {
        if (ep.selectedTable == removedName) ep.selectedTable = null;
      }
    });
  }

  Future<void> _submit() async {
    setState(() => _errorMsg = null);

    if (!_formKey.currentState!.validate()) return;

    if (_columns.isEmpty) {
      setState(() => _errorMsg = 'Añade al menos una columna');
      return;
    }

    if (_endpoints.isEmpty) {
      setState(() => _errorMsg = 'Añade al menos un endpoint');
      return;
    }

    for (final col in _columns) {
      if (col.nameCtrl.text.trim().isEmpty) {
        setState(() => _errorMsg = 'Todos los nombres de columna son obligatorios');
        return;
      }
    }

    for (final tbl in _extraTables) {
      if (tbl.nameCtrl.text.trim().isEmpty) {
        setState(() => _errorMsg = 'El nombre de cada tabla adicional es obligatorio');
        return;
      }
      if (!RegExp(r'^[a-z_][a-z0-9_]*$').hasMatch(tbl.nameCtrl.text.trim())) {
        setState(() => _errorMsg = 'Nombre de tabla solo permite a-z, números y _ (snake_case)');
        return;
      }
      for (final col in tbl.columns) {
        if (col.nameCtrl.text.trim().isEmpty) {
          setState(() => _errorMsg = 'Todos los nombres de columna en tablas adicionales son obligatorios');
          return;
        }
      }
    }

    for (final ep in _endpoints) {
      if (ep.pathCtrl.text.trim().isEmpty || ep.funcCtrl.text.trim().isEmpty) {
        setState(() => _errorMsg = 'Todos los campos de endpoint son obligatorios');
        return;
      }
    }

    setState(() => _isLoading = true);

    try {
      final columns = _columns
          .map((c) => '${c.nameCtrl.text.trim()} ${c.type}')
          .toList();

      final tablesPayload = _extraTables
          .where((t) => t.nameCtrl.text.trim().isNotEmpty)
          .map((t) => {
                'name': t.nameCtrl.text.trim(),
                'columns': t.columns
                    .where((c) => c.nameCtrl.text.trim().isNotEmpty)
                    .map((c) => '${c.nameCtrl.text.trim()} ${c.type}')
                    .toList(),
              })
          .toList();

      final endpoints = _endpoints
          .map((e) => {
                'method': e.method,
                'path': e.pathCtrl.text.trim(),
                'function_name': e.funcCtrl.text.trim(),
                'logic': e.logic,
                if (e.selectedTable != null && e.selectedTable!.isNotEmpty)
                  'table': e.selectedTable!,
                'is_public': e.isPublic,
              })
          .toList();

      final portText = _portCtrl.text.trim();
      final port = portText.isEmpty ? null : int.parse(portText);

      final body = <String, dynamic>{
        'api_name': _nameCtrl.text.trim(),
        'language': _language,
        'db': _dbType,
        'usr': _dbUserCtrl.text.trim(),
        'paswd': _dbPassCtrl.text,
        'columns': columns,
        'tables': tablesPayload,
        'endpoints': endpoints,
        'generar_ui': _generarUi,
      };
      if (port != null) body['port'] = port;

      final apiService = ApiService();
      final authService = AuthService();

      final response = await apiService.crearApi(body);

      final assignedPort = response['puerto'] as int? ?? port ?? 0;
      final dataToSave = Map<String, dynamic>.from(body);
      dataToSave['port'] = assignedPort;
      dataToSave['backup_port'] = response['backup_port'] ?? assignedPort + 1;
      if (_generarUi) {
        dataToSave['ui_url'] = 'https://tfg-dam.libertoguillen.com/app/${_nameCtrl.text.trim()}/ui';
      }

      await authService.guardarApi(dataToSave);

      if (mounted) {
        Navigator.pop(context);
      }
    } catch (e) {
      setState(() {
        _errorMsg = e.toString().replaceFirst('Exception: ', '');
      });
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new),
          onPressed: () => Navigator.pop(context),
        ),
        title: const Text(
          'Nueva API',
          style: TextStyle(color: AppTheme.primaryColor, fontWeight: FontWeight.bold),
        ),
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
          child: Form(
            key: _formKey,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // ── CONFIGURACIÓN BÁSICA ──
                _SectionTitle('Configuración básica'),
                const SizedBox(height: 12),

                TextFormField(
                  controller: _nameCtrl,
                  decoration: const InputDecoration(
                    labelText: 'Nombre de la API',
                    hintText: 'mi_api_rest',
                  ),
                  validator: (v) {
                    if (v == null || v.isEmpty) return 'Campo obligatorio';
                    if (!RegExp(r'^[a-z0-9_]+$').hasMatch(v)) {
                      return 'Solo letras minúsculas, números y guiones bajos';
                    }
                    return null;
                  },
                ),

                const SizedBox(height: 16),

                TextFormField(
                  controller: _portCtrl,
                  decoration: const InputDecoration(
                    labelText: 'Puerto (opcional)',
                    hintText: 'Se asigna automáticamente si se deja vacío',
                  ),
                  keyboardType: TextInputType.number,
                  validator: (v) {
                    if (v == null || v.isEmpty) return null;
                    final port = int.tryParse(v);
                    if (port == null) return 'Debe ser un número';
                    if (port < 1024 || port > 65535) return 'Puerto entre 1024 y 65535';
                    return null;
                  },
                ),

                const SizedBox(height: 24),

                // ── LENGUAJE ──
                _SectionTitle('Lenguaje de la API'),
                const SizedBox(height: 12),

                DropdownButtonFormField<String>(
                  value: _language,
                  decoration: const InputDecoration(labelText: 'Lenguaje'),
                  items: _languageOptions.entries
                      .map((e) => DropdownMenuItem(value: e.key, child: Text(e.value)))
                      .toList(),
                  onChanged: (v) {
                    setState(() {
                      _language = v!;
                      if (_dbType == 'sqlite' && ['go', 'rust', 'c'].contains(_language)) {
                        _dbType = 'postgresql';
                      }
                    });
                  },
                ),

                const SizedBox(height: 24),

                // ── BASE DE DATOS ──
                _SectionTitle('Base de datos'),
                const SizedBox(height: 12),

                DropdownButtonFormField<String>(
                  value: _dbType,
                  decoration: const InputDecoration(labelText: 'Tipo de BD'),
                  items: _availableDbOptions
                      .map((e) => DropdownMenuItem(value: e.key, child: Text(e.value)))
                      .toList(),
                  onChanged: (v) => setState(() => _dbType = v!),
                ),

                const SizedBox(height: 16),

                TextFormField(
                  controller: _dbUserCtrl,
                  decoration: const InputDecoration(labelText: 'Usuario de BD'),
                  validator: (v) =>
                      (v == null || v.isEmpty) ? 'Campo obligatorio' : null,
                ),

                const SizedBox(height: 16),

                TextFormField(
                  controller: _dbPassCtrl,
                  obscureText: _viewPass,
                  decoration: InputDecoration(
                    labelText: 'Contraseña de BD',
                    suffixIcon: IconButton(
                      icon: Icon(
                        _viewPass ? Icons.visibility_off_outlined : Icons.visibility_outlined,
                      ),
                      onPressed: () => setState(() => _viewPass = !_viewPass),
                    ),
                  ),
                  validator: (v) =>
                      (v == null || v.isEmpty) ? 'Campo obligatorio' : null,
                ),

                const SizedBox(height: 24),

                // ── TABLA PRINCIPAL ──
                Row(
                  children: [
                    const Expanded(child: _SectionTitle('Tabla principal')),
                    const SizedBox(width: 8),
                    Tooltip(
                      message: 'Columnas de la tabla principal (data_<nombre_api>)',
                      child: Icon(Icons.info_outline, size: 16, color: AppTheme.secondaryColor),
                    ),
                  ],
                ),
                const SizedBox(height: 4),
                Text(
                  'Columnas de la tabla por defecto',
                  style: TextStyle(
                    fontSize: 12,
                    color: AppTheme.secondaryColor.withOpacity(0.8),
                  ),
                ),
                const SizedBox(height: 12),

                ..._columns.asMap().entries.map((entry) {
                  final i = entry.key;
                  final col = entry.value;
                  return Padding(
                    padding: const EdgeInsets.only(bottom: 10),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Expanded(
                          flex: 3,
                          child: TextFormField(
                            controller: col.nameCtrl,
                            decoration: const InputDecoration(
                              labelText: 'Nombre',
                              hintText: 'nombre_col',
                            ),
                            validator: (v) {
                              if (v == null || v.isEmpty) return 'Obligatorio';
                              if (!RegExp(r'^[a-z_][a-z0-9_]*$').hasMatch(v)) {
                                return 'Solo a-z, números y _';
                              }
                              return null;
                            },
                          ),
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          flex: 3,
                          child: DropdownButtonFormField<String>(
                            value: col.type,
                            decoration: const InputDecoration(labelText: 'Tipo'),
                            isExpanded: true,
                            items: _colTypes
                                .map((t) => DropdownMenuItem(
                                      value: t,
                                      child: Text(t, overflow: TextOverflow.ellipsis),
                                    ))
                                .toList(),
                            onChanged: (v) => setState(() => col.type = v!),
                          ),
                        ),
                        const SizedBox(width: 4),
                        IconButton(
                          icon: const Icon(Icons.close, color: Colors.red),
                          tooltip: 'Eliminar columna',
                          onPressed: _columns.length > 1
                              ? () {
                                  setState(() {
                                    col.dispose();
                                    _columns.removeAt(i);
                                  });
                                }
                              : null,
                        ),
                      ],
                    ),
                  );
                }),

                TextButton.icon(
                  onPressed: () => setState(() => _columns.add(_ColumnEntry())),
                  icon: const Icon(Icons.add),
                  label: const Text('Añadir columna'),
                ),

                const SizedBox(height: 24),

                // ── TABLAS ADICIONALES ──
                _SectionTitle('Tablas adicionales'),
                const SizedBox(height: 4),
                Text(
                  'Define tablas extra que tus endpoints pueden usar',
                  style: TextStyle(
                    fontSize: 12,
                    color: AppTheme.secondaryColor.withOpacity(0.8),
                  ),
                ),
                const SizedBox(height: 12),

                ..._extraTables.asMap().entries.map((entry) {
                  final i = entry.key;
                  final tbl = entry.value;
                  return Card(
                    margin: const EdgeInsets.only(bottom: 12),
                    elevation: 1,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(10),
                      side: BorderSide(color: AppTheme.primaryColor.withOpacity(0.2)),
                    ),
                    child: Padding(
                      padding: const EdgeInsets.fromLTRB(12, 8, 4, 12),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              const Icon(Icons.table_chart_outlined, size: 16, color: AppTheme.primaryColor),
                              const SizedBox(width: 6),
                              Text(
                                'Tabla ${i + 1}',
                                style: const TextStyle(
                                  fontWeight: FontWeight.w600,
                                  fontSize: 13,
                                  color: AppTheme.primaryColor,
                                ),
                              ),
                              const Spacer(),
                              IconButton(
                                icon: const Icon(Icons.close, color: Colors.red, size: 20),
                                tooltip: 'Eliminar tabla',
                                onPressed: () => _removeExtraTable(i),
                                padding: EdgeInsets.zero,
                                constraints: const BoxConstraints(minWidth: 36, minHeight: 36),
                              ),
                            ],
                          ),
                          const SizedBox(height: 8),
                          TextFormField(
                            controller: tbl.nameCtrl,
                            decoration: const InputDecoration(
                              labelText: 'Nombre de la tabla',
                              hintText: 'productos',
                            ),
                            onChanged: (_) => setState(() {}),
                            validator: (v) {
                              if (v == null || v.isEmpty) return 'Obligatorio';
                              if (!RegExp(r'^[a-z_][a-z0-9_]*$').hasMatch(v)) {
                                return 'Solo a-z, números y _ (snake_case)';
                              }
                              return null;
                            },
                          ),
                          const SizedBox(height: 10),
                          Text(
                            'Columnas',
                            style: TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w600,
                              color: AppTheme.secondaryColor,
                            ),
                          ),
                          const SizedBox(height: 6),
                          ...tbl.columns.asMap().entries.map((ce) {
                            final ci = ce.key;
                            final col = ce.value;
                            return Padding(
                              padding: const EdgeInsets.only(bottom: 8),
                              child: Row(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Expanded(
                                    flex: 3,
                                    child: TextFormField(
                                      controller: col.nameCtrl,
                                      decoration: const InputDecoration(
                                        labelText: 'Nombre',
                                        hintText: 'nombre_col',
                                        isDense: true,
                                      ),
                                      validator: (v) {
                                        if (v == null || v.isEmpty) return 'Obligatorio';
                                        if (!RegExp(r'^[a-z_][a-z0-9_]*$').hasMatch(v)) {
                                          return 'Solo a-z, números y _';
                                        }
                                        return null;
                                      },
                                    ),
                                  ),
                                  const SizedBox(width: 6),
                                  Expanded(
                                    flex: 3,
                                    child: DropdownButtonFormField<String>(
                                      value: col.type,
                                      decoration: const InputDecoration(
                                        labelText: 'Tipo',
                                        isDense: true,
                                      ),
                                      isExpanded: true,
                                      items: _colTypes
                                          .map((t) => DropdownMenuItem(
                                                value: t,
                                                child: Text(t, overflow: TextOverflow.ellipsis),
                                              ))
                                          .toList(),
                                      onChanged: (v) => setState(() => col.type = v!),
                                    ),
                                  ),
                                  IconButton(
                                    icon: const Icon(Icons.close, color: Colors.red, size: 18),
                                    onPressed: tbl.columns.length > 1
                                        ? () {
                                            setState(() {
                                              col.dispose();
                                              tbl.columns.removeAt(ci);
                                            });
                                          }
                                        : null,
                                    padding: EdgeInsets.zero,
                                    constraints: const BoxConstraints(minWidth: 32, minHeight: 32),
                                  ),
                                ],
                              ),
                            );
                          }),
                          TextButton.icon(
                            onPressed: () => setState(() => tbl.columns.add(_ColumnEntry())),
                            icon: const Icon(Icons.add, size: 16),
                            label: const Text('Añadir columna', style: TextStyle(fontSize: 13)),
                            style: TextButton.styleFrom(
                              foregroundColor: AppTheme.primaryColor,
                              padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 2),
                            ),
                          ),
                        ],
                      ),
                    ),
                  );
                }),

                TextButton.icon(
                  onPressed: () => setState(() => _extraTables.add(_ExtraTableEntry())),
                  icon: const Icon(Icons.add_box_outlined),
                  label: const Text('Añadir tabla adicional'),
                ),

                const SizedBox(height: 24),

                // ── ENDPOINTS ──
                _SectionTitle('Endpoints'),
                const SizedBox(height: 12),

                ..._endpoints.asMap().entries.map((entry) {
                  final i = entry.key;
                  final ep = entry.value;

                  // Opciones de tabla para este endpoint
                  final tableOpts = _tableOptions;
                  final validTableValue = tableOpts.contains(ep.selectedTable)
                      ? ep.selectedTable
                      : null;

                  return Card(
                    margin: const EdgeInsets.only(bottom: 12),
                    elevation: 1,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Padding(
                      padding: const EdgeInsets.fromLTRB(12, 8, 4, 12),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Align(
                            alignment: Alignment.topRight,
                            child: IconButton(
                              icon: const Icon(Icons.close, color: Colors.red),
                              tooltip: 'Eliminar endpoint',
                              onPressed: _endpoints.length > 1
                                  ? () {
                                      setState(() {
                                        ep.dispose();
                                        _endpoints.removeAt(i);
                                      });
                                    }
                                  : null,
                            ),
                          ),
                          Row(
                            children: [
                              Expanded(
                                child: DropdownButtonFormField<String>(
                                  value: ep.method,
                                  decoration: const InputDecoration(labelText: 'Método'),
                                  items: _methods
                                      .map((m) => DropdownMenuItem(
                                            value: m,
                                            child: Text(m.toUpperCase()),
                                          ))
                                      .toList(),
                                  onChanged: (v) {
                                    if (v == null) return;
                                    setState(() {
                                      ep.method = v;
                                      ep.logic = _defaultLogic(v);
                                    });
                                  },
                                ),
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: DropdownButtonFormField<String>(
                                  value: ep.logic,
                                  decoration: const InputDecoration(labelText: 'Lógica DB'),
                                  items: _logics.map((l) {
                                    final allowed = _strictMatrix[ep.method] ?? [];
                                    final disabled = !allowed.contains(l);
                                    return DropdownMenuItem(
                                      value: l,
                                      enabled: !disabled,
                                      child: Text(
                                        disabled ? '$l ✗' : l,
                                        style: TextStyle(color: disabled ? Colors.grey : null),
                                      ),
                                    );
                                  }).toList(),
                                  onChanged: (v) => setState(() => ep.logic = v!),
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 10),
                          TextFormField(
                            controller: ep.pathCtrl,
                            decoration: const InputDecoration(
                              labelText: 'Path',
                              hintText: '/usuarios',
                            ),
                            validator: (v) {
                              if (v == null || v.isEmpty) return 'Obligatorio';
                              if (!v.startsWith('/')) return 'Debe empezar por /';
                              if (!RegExp(r'^[/a-zA-Z0-9_:{}.\-]+$').hasMatch(v)) {
                                return 'Solo ASCII: letras, números, /, _, -, :, {}';
                              }
                              return null;
                            },
                          ),
                          const SizedBox(height: 10),
                          TextFormField(
                            controller: ep.funcCtrl,
                            decoration: const InputDecoration(
                              labelText: 'Nombre función',
                              hintText: 'get_usuarios',
                            ),
                            validator: (v) {
                              if (v == null || v.isEmpty) return 'Obligatorio';
                              if (!RegExp(r'^[a-z_][a-z0-9_]*$').hasMatch(v)) {
                                return 'Solo letras a-z, números y _ (snake_case)';
                              }
                              return null;
                            },
                          ),
                          const SizedBox(height: 10),
                          DropdownButtonFormField<String?>(
                            value: validTableValue,
                            decoration: const InputDecoration(
                              labelText: 'Tabla',
                              hintText: 'Tabla que usa este endpoint',
                            ),
                            items: [
                              const DropdownMenuItem<String?>(
                                value: null,
                                child: Text('Tabla principal (predeterminada)'),
                              ),
                              ..._extraTables
                                  .map((t) => t.nameCtrl.text.trim())
                                  .where((n) => n.isNotEmpty)
                                  .map((n) => DropdownMenuItem<String?>(
                                        value: n,
                                        child: Text(n),
                                      )),
                            ],
                            onChanged: (v) => setState(() => ep.selectedTable = v),
                          ),
                          const SizedBox(height: 4),
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              const Text(
                                'Endpoint público',
                                style: TextStyle(fontSize: 13, color: AppTheme.primaryColor),
                              ),
                              Switch(
                                value: ep.isPublic,
                                activeColor: AppTheme.primaryColor,
                                onChanged: (v) => setState(() => ep.isPublic = v),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  );
                }),

                TextButton.icon(
                  onPressed: () => setState(() => _endpoints.add(_EndpointEntry())),
                  icon: const Icon(Icons.add),
                  label: const Text('Añadir endpoint'),
                ),

                const SizedBox(height: 24),

                // ── PANEL WEB ──
                SwitchListTile(
                  title: const Text(
                    'Generar panel web',
                    style: TextStyle(color: AppTheme.primaryColor),
                  ),
                  subtitle: const Text(
                    'Interfaz visual accesible desde el navegador',
                    style: TextStyle(color: AppTheme.secondaryColor, fontSize: 13),
                  ),
                  value: _generarUi,
                  activeColor: AppTheme.primaryColor,
                  onChanged: (v) => setState(() => _generarUi = v),
                  contentPadding: EdgeInsets.zero,
                ),

                const SizedBox(height: 16),

                if (_errorMsg != null)
                  Padding(
                    padding: const EdgeInsets.only(bottom: 12),
                    child: Text(
                      _errorMsg!,
                      style: const TextStyle(color: Colors.red, fontSize: 14),
                    ),
                  ),

                SizedBox(
                  width: double.infinity,
                  height: 52,
                  child: _isLoading
                      ? const Center(child: CircularProgressIndicator())
                      : ElevatedButton(
                          onPressed: _submit,
                          child: const Text(
                            'Crear API',
                            style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                          ),
                        ),
                ),

                const SizedBox(height: 24),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _SectionTitle extends StatelessWidget {
  const _SectionTitle(this.text);
  final String text;

  @override
  Widget build(BuildContext context) {
    return Text(
      text,
      style: const TextStyle(
        fontSize: 15,
        fontWeight: FontWeight.bold,
        color: AppTheme.primaryColor,
      ),
    );
  }
}
