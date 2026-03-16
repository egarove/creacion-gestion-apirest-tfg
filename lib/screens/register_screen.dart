import 'dart:io';
import 'package:flutter/material.dart';
import 'package:tfg_2dama_gestion_apirest/theme/app_theme.dart';
import 'package:font_awesome_flutter/font_awesome_flutter.dart'; //para icono de google

class RegisterScreen extends StatefulWidget {
  const RegisterScreen({super.key});

  @override
  State<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends State<RegisterScreen> {
  // Variables para el estado visual
  bool _viewPass = true;
  bool _terminos = false;
  bool _isLoadingEmail = false;
  bool _isLoadingGoogle = false;
  String? _errorTerminos;

  // datos del formulario
  final TextEditingController _email = TextEditingController();  

  //para que la contraseña no se borre cuando cambie la visibilidad
  final TextEditingController _passwordController = TextEditingController(); 

  //variable para comprobar los validator
  final myFormKey = GlobalKey<FormState>();

  @override
  Widget build(BuildContext context) {
    final colorOnSurface = Theme.of(context).colorScheme.onSurface;    

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
              Text(
                'Crear cuenta', 
                style: TextStyle(fontSize: 28, fontWeight: FontWeight.bold, color: colorOnSurface)
              ),
              const Text(
                'Rellena tus datos para comenzar', 
                style: TextStyle(fontSize: 14, color: Colors.grey)
              ),
              const SizedBox(height: 25),

              // ICONO DE AVATAR
              Center(
                child: CircleAvatar(
                        radius: 55,
                        backgroundColor: AppTheme.primaryColor,
                        child:Icon(Icons.person, size: 55, color: Colors.grey[400])
                      ),
              ),
              const SizedBox(height: 25),

              Form(
                key: myFormKey,
                child: Column(
                  children: [

                    TextFormField(
                      controller: _email,
                      decoration: InputDecoration(
                        labelText: 'Email'
                      ),
                      keyboardType: TextInputType.emailAddress,
                      validator: (value) {
                        if (value == null || value.isEmpty) return 'Introduzca un email';
                        return RegExp(r'^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$').hasMatch(value) ? null : 'Correo incorrecto';
                        // r = para que Dart no interprete los caracteres de escape \ dentro del string.
                        // ^ = inicio del texto
                        // [\w-\.]+ = 1 o mas letras o numeros(\w), guiones o puntos
                        // @
                        // ([\w-]+\.)+ = parte del dominio (gmail.)
                        // [\w-]{2,4} = extension del dominio (com)
                      },
                    ),

                    const SizedBox(height: 20),

                    TextFormField(
                      decoration: InputDecoration(
                        labelText: 'Contraseña',
                        suffix: IconButton(
                          onPressed: () => setState(() => _viewPass = !_viewPass),
                          icon: Icon(_viewPass ? Icons.visibility_off_outlined : Icons.visibility_outlined),
                        ),
                      ),
                      controller: _passwordController,
                      obscureText: _viewPass,
                      validator: (value) => (value == null || value.length < 6) ? 'Mínimo 6 caracteres' : null, //return true = input valido
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 25),

              const Row(
                children: [
                  Expanded(child: Divider()), 
                  Padding(padding: EdgeInsets.symmetric(horizontal: 10), child: Text("O continúa con")),
                  Expanded(child: Divider()), 
                ],
              ),

              const SizedBox(height: 20),

              Center(
                child: ElevatedButton(
                  onPressed: () {
                    if (_isLoadingGoogle) return;
                    if (!_terminos) {
                      setState(() => _errorTerminos = 'Debes aceptar los términos');
                      return;
                    }
                    //logica de google
                  },
                  child: FaIcon(FontAwesomeIcons.google),
                ),
              ),

              const SizedBox(height: 25),

              CheckboxListTile(
                title: const Text("Aceptar términos y condiciones"),
                value: _terminos,
                onChanged: (value) {
                  setState(() {
                    _terminos = value!;
                  });
                },
              ),

              const SizedBox(height: 20),

              SizedBox(
                width: double.infinity,
                height: 55,
                child: _isLoadingEmail
                    ? const Center(child: CircularProgressIndicator())
                    : ElevatedButton(
                        child: Text('REGISTRARME'),
                        onPressed: ( () {
                          if (myFormKey.currentState!.validate() && _terminos){
                            //logica
                            //NO OLVIDAR METER LA CONTRASEÑA EN EL MAP DESDE EL CONTROLLER!!!!!!!
                          }
                        })
                      ),
              ),

              const SizedBox(height: 30),
            ],
          ),
        ),
      ),
    );
  }
}