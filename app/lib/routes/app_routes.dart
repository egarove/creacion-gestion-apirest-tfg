import 'package:flutter/widgets.dart';
import 'package:tfg_2dama_gestion_apirest/screens/screens.dart';

class AppRoutes {
  
  static const initialRoute = 'home';

  static Map<String, Widget Function(BuildContext)> routes = {
    'home': (BuildContext context) => const HomeScreen(),
    'login': (BuildContext context) => const LoginScreen(),
    'register': (BuildContext context) => const RegisterScreen(),
    'dashboard': (BuildContext context) => const DashboardScreen(),
    'crear-api': (BuildContext context) => const CrearApiScreen(),
    'api-detail': (BuildContext context) => const ApiDetailScreen(),
    'endpoint-tester': (BuildContext context) => const EndpointTesterScreen(),
  };
}
