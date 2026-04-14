import 'package:flutter/material.dart';
import 'package:tfg_2dama_gestion_apirest/routes/app_routes.dart';
import 'package:tfg_2dama_gestion_apirest/theme/app_theme.dart';
import 'package:firebase_core/firebase_core.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized(); 
  await Firebase.initializeApp(); //inicializamos firebase
  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      debugShowCheckedModeBanner: false,
      title: 'Gestion API Rest',
      theme: AppTheme.lightTheme(),
      routes: AppRoutes.routes,
      initialRoute: AppRoutes.initialRoute,
    );
  }
}