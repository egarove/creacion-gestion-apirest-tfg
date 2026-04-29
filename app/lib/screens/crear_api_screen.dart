import 'package:flutter/material.dart';
import 'package:tfg_2dama_gestion_apirest/services/api_service.dart';
import 'package:tfg_2dama_gestion_apirest/services/login_singup_methods.dart';
import 'package:tfg_2dama_gestion_apirest/theme/app_theme.dart';

// Modelo interno para columnas
class _ColumnEntry {
  final TextEditingController nameCtrl = TextEditingController();
  String type = 'VARCHAR(255)';

  void dispose() => nameCtrl.dispose();
}

// Modelo interno para endpoints
class _EndpointEntry {
  String method = 'get';
  final TextEditingController pathCtrl = TextEditingController();
  final TextEditingController funcCtrl = TextEditingController();
  String logic = 'select';

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

  // Configuración básica
  final _nameCtrl = TextEditingController();
  final _portCtrl = TextEditingController();

  // Base de datos
  String _dbType = 'postgresql';
  final _dbUserCtrl = TextEditingController();
  final _dbPassCtrl = TextEditingController();
  bool _viewPass = true;

  // Lenguaje de la API
  String _language = 'python';

  // Columnas
  final List<_ColumnEntry> _columns = [_ColumnEntry()];

  // Endpoints
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

  @override
  void dispose() {
    _nameCtrl.dispose();
    _portCtrl.dispose();
    _dbUserCtrl.dispose();
    _dbPassCtrl.dispose();
    for (final c in _columns) {
      c.dispose();
    }
    for (final e in _endpoints) {
      e.dispose();
    }
    super.dispose();
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

    // Validar nombres de columnas
    for (final col in _columns) {
      if (col.nameCtrl.text.trim().isEmpty) {
        setState(() => _errorMsg = 'Todos los nombres de columna son obligatorios');
        return;
      }
    }

    // Validar endpoints
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

      final endpoints = _endpoints
          .map((e) => {
                'method': e.method,
                'path': e.pathCtrl.text.trim(),
                'function_name': e.funcCtrl.text.trim(),
                'logic': e.logic,
              })
          .toList();

      final port = int.parse(_portCtrl.text.trim());

      final body = {
        'api_name': _nameCtrl.text.trim(),
        'port': port,
        'language': _language,
        'db': _dbType,
        'usr': _dbUserCtrl.text.trim(),
        'paswd': _dbPassCtrl.text,
        'columns': columns,
        'endpoints': endpoints,
        'generar_ui': _generarUi,
      };

      final apiService = ApiService();
      final authService = AuthService();

      final response = await apiService.crearApi(body);

      final dataToSave = Map<String, dynamic>.from(body);
      dataToSave['backup_port'] = response['backup_port'] ?? port + 1;
      if (_generarUi) {
        dataToSave['ui_url'] = 'http://172.16.50.79:$port/ui';
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
                    labelText: 'Puerto',
                    hintText: '8080',
                  ),
                  keyboardType: TextInputType.number,
                  validator: (v) {
                    if (v == null || v.isEmpty) return 'Campo obligatorio';
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
                      .map((e) => DropdownMenuItem(
                            value: e.key,
                            child: Text(e.value),
                          ))
                      .toList(),
                  onChanged: (v) => setState(() => _language = v!),
                ),

                const SizedBox(height: 24),

                // ── BASE DE DATOS ──
                _SectionTitle('Base de datos'),
                const SizedBox(height: 12),

                DropdownButtonFormField<String>(
                  value: _dbType,
                  decoration: const InputDecoration(labelText: 'Tipo de BD'),
                  items: _dbOptions.entries
                      .map((e) => DropdownMenuItem(
                            value: e.key,
                            child: Text(e.value),
                          ))
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
                        _viewPass
                            ? Icons.visibility_off_outlined
                            : Icons.visibility_outlined,
                      ),
                      onPressed: () => setState(() => _viewPass = !_viewPass),
                    ),
                  ),
                  validator: (v) =>
                      (v == null || v.isEmpty) ? 'Campo obligatorio' : null,
                ),

                const SizedBox(height: 24),

                // ── COLUMNAS ──
                _SectionTitle('Columnas'),
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
                              hintText: 'name',
                            ),
                            validator: (v) {
                              if (v == null || v.isEmpty) return 'Obligatorio';
                              if (v.contains(' ')) return 'Sin espacios';
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
                                      child: Text(
                                        t,
                                        overflow: TextOverflow.ellipsis,
                                      ),
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

                // ── ENDPOINTS ──
                _SectionTitle('Endpoints'),
                const SizedBox(height: 12),

                ..._endpoints.asMap().entries.map((entry) {
                  final i = entry.key;
                  final ep = entry.value;
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
                                  onChanged: (v) => setState(() => ep.method = v!),
                                ),
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: DropdownButtonFormField<String>(
                                  value: ep.logic,
                                  decoration: const InputDecoration(labelText: 'Lógica'),
                                  items: _logics
                                      .map((l) => DropdownMenuItem(
                                            value: l,
                                            child: Text(l),
                                          ))
                                      .toList(),
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
                              if (v.contains(' ')) return 'Sin espacios (usa snake_case)';
                              return null;
                            },
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

                // ── ERROR ──
                if (_errorMsg != null)
                  Padding(
                    padding: const EdgeInsets.only(bottom: 12),
                    child: Text(
                      _errorMsg!,
                      style: const TextStyle(color: Colors.red, fontSize: 14),
                    ),
                  ),

                // ── BOTÓN CREAR ──
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
