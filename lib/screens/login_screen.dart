import 'package:font_awesome_flutter/font_awesome_flutter.dart'; //para icono de google
import 'package:tfg_2dama_gestion_apirest/theme/app_theme.dart';
import 'package:flutter/material.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  
  bool _viewPass = true;
  bool _isLoading = false;

  final TextEditingController _email = TextEditingController();
  final TextEditingController _password = TextEditingController();



  @override
  Widget build(BuildContext context) {

    return Scaffold(
      appBar: AppBar(
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new),
          onPressed: () => Navigator.pop(context),
        ),
      ),

      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 24.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [

              SizedBox(height: 30,),

              Text(
                'Bienvenido',
                style: TextStyle(
                  fontWeight: FontWeight.bold, 
                  color: AppTheme.secondaryColor
                ),
              ),

              const SizedBox(height: 8),

              Text(
                'Inicia sesión para continuar',
                style: TextStyle(fontSize: 14, color: AppTheme.secondaryColor),
              ),

              const SizedBox(height: 25),

              Form(
                child: Column(
                  children: [
                    TextFormField(
                      controller: _email,
                      decoration: InputDecoration(
                        labelText: 'Correo Electronico'
                      ),
                      keyboardType: TextInputType.emailAddress,
                      validator: (value) {
                        if (value == null || value.isEmpty) return 'Introduzca un email';
                        return null;
                      },
                    ),

                    const SizedBox(height: 20),

                    TextFormField(
                      controller: _password,
                      decoration: InputDecoration(
                        labelText: 'Contraseña',
                        suffixIcon: IconButton(
                          onPressed: () => setState(() => _viewPass = !_viewPass),
                          icon: Icon(
                            _viewPass ? Icons.visibility_off_outlined : Icons.visibility_outlined,
                          ),
                        ),
                      ),
                      obscureText: _viewPass,
                      validator: (value) {
                        if (value == null || value.isEmpty) return 'Obligatorio';
                        return null;
                      },
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 10),

              _isLoading
                  ? const Center(child: CircularProgressIndicator()) //si carga muestra un circulo de carga
                  : Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch, //los hijos ocupan el ancho
                      children: [
                        ElevatedButton(
                          onPressed: () {},
                          child: Text('Iniciar Sesion')
                        )
                      ],
                    ),
              const SizedBox(height: 25),
              
              const Row(
                children: [
                  //lineas a los lados
                  Expanded(child: Divider()),
                  Padding(padding: EdgeInsets.symmetric(horizontal: 10), child: Text("O continúa con")),
                  Expanded(child: Divider()),
                ],
              ),
              const SizedBox(height: 20),
              Center(
                child: ElevatedButton(
                  onPressed: () {},
                  child: FaIcon(FontAwesomeIcons.google),
                )
              ),

              const SizedBox(height: 30),

              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text('¿No tienes cuenta?', style: TextStyle(color: AppTheme.secondaryColor)),
                  TextButton(
                    onPressed: () => Navigator.pushNamed(context, 'register'),
                    child: const Text('Regístrate aquí', style: TextStyle(color: AppTheme.errorColor, fontWeight: FontWeight.bold)),
                  ),
                ],
              ),
          ]),
        ),
      ),
    );
  }
}