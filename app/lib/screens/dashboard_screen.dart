import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter/material.dart';
import 'package:tfg_2dama_gestion_apirest/services/api_service.dart';
import 'package:tfg_2dama_gestion_apirest/services/login_singup_methods.dart';
import 'package:tfg_2dama_gestion_apirest/theme/app_theme.dart';
import 'package:firebase_auth/firebase_auth.dart';

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  final authService = AuthService();
  final apiService = ApiService();
  int _refreshKey = 0;

  @override
  void initState() {
    super.initState();
    _cleanOrphanedApis();
  }

  Future<void> _cleanOrphanedApis() async {
    final serverNames = await apiService.syncApiNames();
    if (serverNames == null) return;

    final uid = FirebaseAuth.instance.currentUser?.uid;
    if (uid == null) return;

    final snapshot = await FirebaseFirestore.instance
        .collection('usuarios')
        .doc(uid)
        .collection('apis')
        .get();

    final orphans = snapshot.docs.where((doc) => !serverNames.contains(doc.id)).toList();
    for (final doc in orphans) {
      await doc.reference.delete();
    }

    if (orphans.isNotEmpty && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            '${orphans.length} API(s) eliminadas: no existen en el servidor',
          ),
          backgroundColor: Colors.orange,
        ),
      );
    }
  }

  Future<void> _onRefresh() async {
    setState(() => _refreshKey++);
    _cleanOrphanedApis();
    await Future.delayed(const Duration(milliseconds: 600));
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        automaticallyImplyLeading: false,
        title: const Text(
          'Mis APIs',
          style: TextStyle(
            color: AppTheme.primaryColor,
            fontWeight: FontWeight.bold,
          ),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.science_outlined),
            tooltip: 'Laboratorio de Endpoints',
            onPressed: () => Navigator.pushNamed(context, 'endpoint-tester'),
          ),
          IconButton(
            icon: const Icon(Icons.logout),
            tooltip: 'Cerrar sesión',
            onPressed: () async {
              await authService.signOut();
              if (context.mounted) {
                Navigator.pushNamedAndRemoveUntil(
                  context,
                  'home',
                  (route) => false,
                );
              }
            },
          ),
        ],
      ),
      body: StreamBuilder<QuerySnapshot>(
        stream: authService.streamApis(),
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          }

          if (snapshot.hasError) {
            return Center(
              child: Text(
                'Error al cargar las APIs',
                style: TextStyle(color: AppTheme.secondaryColor),
              ),
            );
          }

          final docs = snapshot.data?.docs ?? [];

          if (docs.isEmpty) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.api, size: 72, color: AppTheme.secondaryColor),
                  const SizedBox(height: 16),
                  const Text(
                    'No tienes ninguna API creada aún',
                    style: TextStyle(
                      fontSize: 16,
                      color: AppTheme.secondaryColor,
                    ),
                  ),
                  const SizedBox(height: 8),
                  const Text(
                    'Pulsa el botón + para crear tu primera API',
                    style: TextStyle(
                      fontSize: 13,
                      color: AppTheme.secondaryColor,
                    ),
                  ),
                ],
              ),
            );
          }

          return RefreshIndicator(
            onRefresh: _onRefresh,
            color: AppTheme.primaryColor,
            child: ListView.builder(
            padding: const EdgeInsets.all(16),
            itemCount: docs.length,
            itemBuilder: (context, index) {
              final data = docs[index].data() as Map<String, dynamic>;
              final apiName = data['api_name'] as String? ?? '';
              final port = data['port'];
              final db = data['db'] as String? ?? '';
              final columns =
                  (data['columns'] as List<dynamic>?)?.cast<String>() ?? [];
              final endpoints =
                  (data['endpoints'] as List<dynamic>?)
                      ?.map((e) => Map<String, dynamic>.from(e as Map))
                      .toList() ??
                  [];

              return Card(
                margin: const EdgeInsets.only(bottom: 12),
                elevation: 2,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
                color: AppTheme.surfaceColor,
                clipBehavior: Clip.antiAlias,
                child: InkWell(
                  borderRadius: BorderRadius.circular(12),
                  onTap: () => Navigator.pushNamed(
                    context,
                    'api-detail',
                    arguments: {
                      'api_name': apiName,
                      'port': port,
                      'backup_port': data['backup_port'],
                      'db': db,
                      'columns': columns,
                      'endpoints': endpoints,
                      'ui_url': data['ui_url'],
                    },
                  ),
                  child: Padding(
                  padding: const EdgeInsets.fromLTRB(16, 16, 8, 16),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              apiName,
                              style: const TextStyle(
                                fontSize: 17,
                                fontWeight: FontWeight.bold,
                                color: AppTheme.primaryColor,
                              ),
                            ),
                            const SizedBox(height: 8),
                            _InfoRow(label: 'Puerto', value: port.toString()),
                            _InfoRow(label: 'Base de datos', value: db),
                            _InfoRow(
                              label: 'Columnas',
                              value: columns.isNotEmpty
                                  ? columns.join(', ')
                                  : '—',
                            ),
                          ],
                        ),
                      ),
                      IconButton(
                        icon: const Icon(Icons.delete_outline, color: Colors.red),
                        tooltip: 'Eliminar API',
                        onPressed: () => _confirmDelete(
                          context,
                          apiName,
                          apiService,
                          authService,
                        ),
                      ),
                    ],
                  ),
                ),
                ),
              );
            },
          ),
          );
        },
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () => Navigator.pushNamed(context, 'crear-api'),
        backgroundColor: AppTheme.primaryColor,
        tooltip: 'Nueva API',
        child: const Icon(Icons.add, color: Colors.white),
      ),
    );
  }

  void _confirmDelete(
    BuildContext context,
    String apiName,
    ApiService apiService,
    AuthService authService,
  ) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        title: const Text('Eliminar API'),
        content: Text(
          '¿Eliminar la API "$apiName"? Esta acción no se puede deshacer.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Cancelar'),
          ),
          TextButton(
            onPressed: () async {
              Navigator.pop(ctx);
              try {
                await apiService.eliminarApi(apiName);
                await authService.eliminarApiFirestore(apiName);
                if (context.mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(
                      content: Text('API eliminada correctamente'),
                    ),
                  );
                }
              } catch (e) {
                if (context.mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                      content: Text(
                        e.toString().replaceFirst('Exception: ', ''),
                      ),
                      backgroundColor: Colors.red,
                    ),
                  );
                }
              }
            },
            child: const Text(
              'Eliminar',
              style: TextStyle(color: Colors.red),
            ),
          ),
        ],
      ),
    );
  }
}

class _InfoRow extends StatelessWidget {
  const _InfoRow({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 4),
      child: RichText(
        text: TextSpan(
          style: const TextStyle(color: AppTheme.primaryColor, fontSize: 13),
          children: [
            TextSpan(
              text: '$label: ',
              style: const TextStyle(fontWeight: FontWeight.w600),
            ),
            TextSpan(text: value),
          ],
        ),
      ),
    );
  }
}
