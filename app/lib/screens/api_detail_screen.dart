import 'package:flutter/material.dart';
import 'package:tfg_2dama_gestion_apirest/services/api_service.dart';
import 'package:tfg_2dama_gestion_apirest/services/login_singup_methods.dart';
import 'package:tfg_2dama_gestion_apirest/theme/app_theme.dart';
import 'package:url_launcher/url_launcher.dart';

class ApiDetailScreen extends StatefulWidget {
  const ApiDetailScreen({super.key});

  @override
  State<ApiDetailScreen> createState() => _ApiDetailScreenState();
}

class _ApiDetailScreenState extends State<ApiDetailScreen> {
  late Map<String, dynamic> _apiData;
  late List<Map<String, dynamic>> _endpoints;
  bool _initialized = false;

  String? _mainStatus;
  String? _backupStatus;
  bool _statusLoading = true;
  bool _restoreLoading = false;

  static Color _methodColor(String method) {
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
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (!_initialized) {
      _apiData =
          ModalRoute.of(context)!.settings.arguments as Map<String, dynamic>;
      _endpoints = (_apiData['endpoints'] as List<dynamic>?)
              ?.map((e) => Map<String, dynamic>.from(e as Map))
              .toList() ??
          [];
      _initialized = true;
      _loadStatus();
    }
  }

  Future<void> _loadStatus() async {
    setState(() => _statusLoading = true);
    try {
      final apiName = _apiData['api_name'] as String;
      final result = await ApiService().getStatus(apiName);
      if (mounted) {
        setState(() {
          _mainStatus = result['status'] as String? ?? 'unknown';
          _backupStatus = result['backup_status'] as String? ?? 'unknown';
          _statusLoading = false;
        });
      }
    } catch (_) {
      if (mounted) {
        setState(() {
          _mainStatus = 'unknown';
          _backupStatus = 'unknown';
          _statusLoading = false;
        });
      }
    }
  }

  Future<void> _restore() async {
    setState(() => _restoreLoading = true);
    try {
      final apiName = _apiData['api_name'] as String;
      await ApiService().restoreApi(apiName);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('API restaurada correctamente')),
        );
      }
      await _loadStatus();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(e.toString().replaceFirst('Exception: ', '')),
            backgroundColor: Colors.red,
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _restoreLoading = false);
    }
  }

  bool get _someContainerDown {
    const running = 'running';
    return _mainStatus != running || _backupStatus != running;
  }

  Widget _statusDot(String? status) {
    final isRunning = status == 'running';
    return Container(
      width: 10,
      height: 10,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        color: isRunning ? const Color(0xFF4CAF50) : Colors.red,
      ),
    );
  }

  void _openAddEndpointSheet() {
    final formKey = GlobalKey<FormState>();
    final pathCtrl = TextEditingController();
    final funcCtrl = TextEditingController();
    String method = 'get';
    String logic = 'select';
    bool isLoading = false;
    String? errorMsg;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (sheetCtx) {
        return StatefulBuilder(
          builder: (ctx, setSheetState) {
            return Padding(
              padding: EdgeInsets.only(
                left: 20,
                right: 20,
                top: 24,
                bottom: MediaQuery.of(ctx).viewInsets.bottom + 24,
              ),
              child: Form(
                key: formKey,
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        const Expanded(
                          child: Text(
                            'Nuevo endpoint',
                            style: TextStyle(
                              fontSize: 18,
                              fontWeight: FontWeight.bold,
                              color: AppTheme.primaryColor,
                            ),
                          ),
                        ),
                        IconButton(
                          icon: const Icon(Icons.close),
                          onPressed: () => Navigator.pop(sheetCtx),
                        ),
                      ],
                    ),
                    const SizedBox(height: 16),

                    Row(
                      children: [
                        Expanded(
                          child: DropdownButtonFormField<String>(
                            value: method,
                            decoration:
                                const InputDecoration(labelText: 'Método'),
                            items: ['get', 'post', 'put', 'delete']
                                .map((m) => DropdownMenuItem(
                                      value: m,
                                      child: Text(m.toUpperCase()),
                                    ))
                                .toList(),
                            onChanged: (v) => setSheetState(() => method = v!),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: DropdownButtonFormField<String>(
                            value: logic,
                            decoration:
                                const InputDecoration(labelText: 'Lógica'),
                            items: ['select', 'insert', 'update', 'delete']
                                .map((l) => DropdownMenuItem(
                                      value: l,
                                      child: Text(l),
                                    ))
                                .toList(),
                            onChanged: (v) => setSheetState(() => logic = v!),
                          ),
                        ),
                      ],
                    ),

                    const SizedBox(height: 14),

                    TextFormField(
                      controller: pathCtrl,
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

                    const SizedBox(height: 14),

                    TextFormField(
                      controller: funcCtrl,
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

                    const SizedBox(height: 12),

                    if (errorMsg != null)
                      Padding(
                        padding: const EdgeInsets.only(bottom: 8),
                        child: Text(
                          errorMsg!,
                          style: const TextStyle(color: Colors.red, fontSize: 13),
                        ),
                      ),

                    const SizedBox(height: 4),

                    SizedBox(
                      width: double.infinity,
                      height: 48,
                      child: isLoading
                          ? const Center(child: CircularProgressIndicator())
                          : ElevatedButton(
                              onPressed: () async {
                                if (!formKey.currentState!.validate()) return;

                                setSheetState(() {
                                  isLoading = true;
                                  errorMsg = null;
                                });

                                final newEndpoint = {
                                  'method': method,
                                  'path': pathCtrl.text.trim(),
                                  'function_name': funcCtrl.text.trim(),
                                  'logic': logic,
                                };

                                try {
                                  final apiService = ApiService();
                                  final authService = AuthService();
                                  final apiName =
                                      _apiData['api_name'] as String;

                                  await apiService.crearEndpoint(
                                    apiName,
                                    Map<String, String>.from(newEndpoint),
                                  );

                                  await authService.agregarEndpointFirestore(
                                    apiName,
                                    newEndpoint,
                                  );

                                  setState(() => _endpoints.add(newEndpoint));

                                  if (sheetCtx.mounted) {
                                    Navigator.pop(sheetCtx);
                                  }

                                  if (mounted) {
                                    ScaffoldMessenger.of(context).showSnackBar(
                                      const SnackBar(
                                        content: Text(
                                            'Endpoint añadido correctamente'),
                                      ),
                                    );
                                  }
                                } catch (e) {
                                  setSheetState(() {
                                    isLoading = false;
                                    errorMsg = e
                                        .toString()
                                        .replaceFirst('Exception: ', '');
                                  });
                                }
                              },
                              child: const Text(
                                'Añadir endpoint',
                                style: TextStyle(fontWeight: FontWeight.bold),
                              ),
                            ),
                    ),
                  ],
                ),
              ),
            );
          },
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final apiName = _apiData['api_name'] as String? ?? '';
    final port = _apiData['port'];
    final backupPort = _apiData['backup_port'];
    final db = _apiData['db'] as String? ?? '';
    final columns =
        (_apiData['columns'] as List<dynamic>?)?.cast<String>() ?? [];
    final uiUrl = _apiData['ui_url'] as String?;

    return Scaffold(
      appBar: AppBar(
        title: Text(
          apiName,
          style: const TextStyle(
            color: AppTheme.primaryColor,
            fontWeight: FontWeight.bold,
          ),
        ),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // ── SECCIÓN INFORMACIÓN ──
            const _SectionHeader('Información'),
            const SizedBox(height: 8),

            Card(
              elevation: 1,
              shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12)),
              color: AppTheme.surfaceColor,
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _DetailRow(label: 'Puerto', value: port.toString()),
                    const SizedBox(height: 6),
                    _DetailRow(label: 'Base de datos', value: db),
                    const SizedBox(height: 10),
                    Text(
                      'Columnas',
                      style: const TextStyle(
                        fontWeight: FontWeight.w600,
                        fontSize: 13,
                        color: AppTheme.primaryColor,
                      ),
                    ),
                    const SizedBox(height: 6),
                    Wrap(
                      spacing: 6,
                      runSpacing: 4,
                      children: columns.isEmpty
                          ? [
                              const Text(
                                '—',
                                style: TextStyle(color: AppTheme.secondaryColor),
                              )
                            ]
                          : columns
                              .map(
                                (col) => Chip(
                                  label: Text(
                                    col,
                                    style: const TextStyle(
                                      fontSize: 12,
                                      color: AppTheme.primaryColor,
                                    ),
                                  ),
                                  backgroundColor: AppTheme.backgroundColor,
                                  side: const BorderSide(
                                      color: AppTheme.secondaryColor),
                                  padding: EdgeInsets.zero,
                                  materialTapTargetSize:
                                      MaterialTapTargetSize.shrinkWrap,
                                ),
                              )
                              .toList(),
                    ),

                    const SizedBox(height: 14),

                    // ── ESTADO CONTENEDORES ──
                    Text(
                      'Contenedores',
                      style: const TextStyle(
                        fontWeight: FontWeight.w600,
                        fontSize: 13,
                        color: AppTheme.primaryColor,
                      ),
                    ),
                    const SizedBox(height: 8),
                    _statusLoading
                        ? const SizedBox(
                            height: 24,
                            width: 24,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          )
                        : Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                children: [
                                  _statusDot(_mainStatus),
                                  const SizedBox(width: 8),
                                  Text(
                                    '$apiName  (puerto $port)',
                                    style: const TextStyle(
                                      fontSize: 13,
                                      color: AppTheme.primaryColor,
                                    ),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 6),
                              Row(
                                children: [
                                  _statusDot(_backupStatus),
                                  const SizedBox(width: 8),
                                  Text(
                                    '${apiName}_backup  (puerto ${backupPort ?? '—'})',
                                    style: const TextStyle(
                                      fontSize: 13,
                                      color: AppTheme.primaryColor,
                                    ),
                                  ),
                                ],
                              ),
                            ],
                          ),

                    // ── BOTÓN RESTAURAR ──
                    if (!_statusLoading && _someContainerDown) ...[
                      const SizedBox(height: 14),
                      SizedBox(
                        width: double.infinity,
                        child: _restoreLoading
                            ? const Center(
                                child: Padding(
                                  padding: EdgeInsets.symmetric(vertical: 8),
                                  child: CircularProgressIndicator(),
                                ),
                              )
                            : OutlinedButton.icon(
                                onPressed: _restore,
                                icon: const Icon(Icons.restore,
                                    color: AppTheme.primaryColor),
                                label: const Text(
                                  'Restaurar API',
                                  style:
                                      TextStyle(color: AppTheme.primaryColor),
                                ),
                                style: OutlinedButton.styleFrom(
                                  side: const BorderSide(
                                      color: AppTheme.primaryColor),
                                  shape: RoundedRectangleBorder(
                                    borderRadius: BorderRadius.circular(8),
                                  ),
                                ),
                              ),
                      ),
                    ],
                  ],
                ),
              ),
            ),

            // ── PANEL WEB ──
            if (uiUrl != null) ...[
              const SizedBox(height: 24),
              const _SectionHeader('Panel web'),
              const SizedBox(height: 8),
              Card(
                elevation: 1,
                shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12)),
                color: AppTheme.surfaceColor,
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'URL de acceso',
                        style: TextStyle(
                          fontWeight: FontWeight.w600,
                          fontSize: 13,
                          color: AppTheme.primaryColor,
                        ),
                      ),
                      const SizedBox(height: 6),
                      SelectableText(
                        uiUrl,
                        style: const TextStyle(
                          fontSize: 13,
                          color: AppTheme.secondaryColor,
                        ),
                      ),
                      const SizedBox(height: 10),
                      OutlinedButton.icon(
                        onPressed: () async {
                          final uri = Uri.parse(uiUrl);
                          try {
                            await launchUrl(uri,
                                mode: LaunchMode.externalApplication);
                          } catch (_) {
                            if (context.mounted) {
                              ScaffoldMessenger.of(context).showSnackBar(
                                SnackBar(
                                  content: Text('No se pudo abrir $uiUrl'),
                                  backgroundColor: Colors.red,
                                ),
                              );
                            }
                          }
                        },
                        icon: const Icon(Icons.open_in_browser,
                            color: AppTheme.primaryColor),
                        label: const Text(
                          'Abrir en navegador',
                          style: TextStyle(color: AppTheme.primaryColor),
                        ),
                        style: OutlinedButton.styleFrom(
                          side: const BorderSide(color: AppTheme.primaryColor),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(8),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ],

            const SizedBox(height: 24),

            // ── SECCIÓN ENDPOINTS ──
            Row(
              children: [
                const Expanded(child: _SectionHeader('Endpoints')),
                TextButton.icon(
                  onPressed: _openAddEndpointSheet,
                  icon: const Icon(Icons.add, size: 18),
                  label: const Text('Nuevo endpoint'),
                ),
              ],
            ),
            const SizedBox(height: 8),

            if (_endpoints.isEmpty)
              const Padding(
                padding: EdgeInsets.symmetric(vertical: 16),
                child: Center(
                  child: Text(
                    'No hay endpoints definidos',
                    style: TextStyle(color: AppTheme.secondaryColor),
                  ),
                ),
              )
            else
              ..._endpoints.map((ep) {
                final epMethod = ep['method'] as String? ?? '';
                final epPath = ep['path'] as String? ?? '';
                final epFunc = ep['function_name'] as String? ?? '';
                final epLogic = ep['logic'] as String? ?? '';
                final color = _methodColor(epMethod);

                return Card(
                  margin: const EdgeInsets.only(bottom: 10),
                  elevation: 1,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(10),
                    side: BorderSide(color: color.withOpacity(0.3)),
                  ),
                  color: AppTheme.surfaceColor,
                  child: Padding(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 14, vertical: 12),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 8, vertical: 4),
                          decoration: BoxDecoration(
                            color: color,
                            borderRadius: BorderRadius.circular(6),
                          ),
                          child: Text(
                            epMethod.toUpperCase(),
                            style: const TextStyle(
                              color: Colors.white,
                              fontSize: 11,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                epPath,
                                style: const TextStyle(
                                  fontWeight: FontWeight.w600,
                                  fontSize: 14,
                                  color: AppTheme.primaryColor,
                                ),
                              ),
                              const SizedBox(height: 3),
                              Text(
                                'Función: $epFunc',
                                style: const TextStyle(
                                  fontSize: 12,
                                  color: AppTheme.secondaryColor,
                                ),
                              ),
                              Text(
                                'Lógica: $epLogic',
                                style: const TextStyle(
                                  fontSize: 12,
                                  color: AppTheme.secondaryColor,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                );
              }),

            const SizedBox(height: 80),
          ],
        ),
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: _openAddEndpointSheet,
        backgroundColor: AppTheme.primaryColor,
        tooltip: 'Nuevo endpoint',
        child: const Icon(Icons.add, color: Colors.white),
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
        fontSize: 16,
        fontWeight: FontWeight.bold,
        color: AppTheme.primaryColor,
      ),
    );
  }
}

class _DetailRow extends StatelessWidget {
  const _DetailRow({required this.label, required this.value});
  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return RichText(
      text: TextSpan(
        style: const TextStyle(color: AppTheme.primaryColor, fontSize: 14),
        children: [
          TextSpan(
            text: '$label: ',
            style: const TextStyle(fontWeight: FontWeight.w600),
          ),
          TextSpan(text: value),
        ],
      ),
    );
  }
}
