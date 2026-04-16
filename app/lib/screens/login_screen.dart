import 'package:font_awesome_flutter/font_awesome_flutter.dart';
import 'package:tfg_2dama_gestion_apirest/theme/app_theme.dart';
import 'package:flutter/material.dart';
import 'package:tfg_2dama_gestion_apirest/services/login_singup_methods.dart';
import 'package:firebase_auth/firebase_auth.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {

  bool _viewPass = true;
  bool _isLoading = false;
  bool _isLoadingGoogle = false;

  String? _errorGeneral;

  final authService = AuthService();

  final TextEditingController _email = TextEditingController();
  final TextEditingController _password = TextEditingController();

  final _formKey = GlobalKey<FormState>();

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

              const SizedBox(height: 30),

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

              //formulario
              Form(
                key: _formKey,
                child: Column(
                  children: [
                    TextFormField(
                      controller: _email,
                      decoration: const InputDecoration(
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

                    //PARA REESTABLECER CONTRASEÑA
                    const SizedBox(height: 10),
                    Align(
                      alignment: Alignment.centerRight,
                      child: TextButton(
                        onPressed: () async {
                          if (_email.text.isEmpty) {
                            setState(() {
                              _errorGeneral = 'Introduce tu email para recuperar la contraseña';
                            });
                            return;
                          }

                          try {
                            await authService.sendPasswordResetEmail(_email.text);

                            setState(() {
                              _errorGeneral = 'Correo de recuperación enviado';
                            });
                          } on FirebaseAuthException catch (e) {
                            setState(() {
                              _errorGeneral = e.message;
                            });
                          }
                        },
                        child: const Text('¿Has olvidado la contraseña?'),
                      ),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 10),

              //muestra error
              if (_errorGeneral != null)
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  child: Text(
                    _errorGeneral!,
                    style: const TextStyle(color: Colors.red),
                  ),
                ),

              const SizedBox(height: 10),

              //boton para iniciar sesion con correo y contraseña
              _isLoading
                  ? const Center(child: CircularProgressIndicator())
                  : Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        ElevatedButton(
                          onPressed: () async {
                            if (_isLoading) return;

                            if (_formKey.currentState!.validate()) {
                              FocusScope.of(context).unfocus();

                              setState(() {
                                _isLoading = true;
                                _errorGeneral = null;
                              });

                              try {
                                UserCredential? user = await authService.signInWithEmail(
                                  _email.text,
                                  _password.text,
                                );

                                if (user != null && mounted) {
                                  Navigator.pushNamedAndRemoveUntil(
                                    context,
                                    'dashboard',
                                    (route) => false,
                                  );
                                }
                              } on FirebaseAuthException catch (e) {
                                setState(() {
                                  _errorGeneral = e.message;
                                });
                              } finally {
                                setState(() => _isLoading = false);
                              }
                            }
                          },
                          child: const Text('Iniciar Sesion')
                        )
                      ],
                    ),

              const SizedBox(height: 25),

              const Row(
                children: [
                  Expanded(child: Divider()),
                  Padding(
                    padding: EdgeInsets.symmetric(horizontal: 10),
                    child: Text("O continúa con")
                  ),
                  Expanded(child: Divider()),
                ],
              ),

              const SizedBox(height: 20),

              Center(
                child: ElevatedButton(
                  onPressed: () async {
                    if (_isLoadingGoogle) return;

                    setState(() {
                      _isLoadingGoogle = true;
                      _errorGeneral = null; //borramos mensaje de error
                    });

                    try {
                      UserCredential? user = await authService.signInWithGoogle();

                      if (user != null && mounted) {
                        Navigator.pushNamedAndRemoveUntil(
                          context,
                          'dashboard',
                          (route) => false,
                        );
                      }
                    } catch (e) {
                      setState(() {
                        _errorGeneral = e.toString(); //error al logear con google
                      });
                    } finally {
                      setState(() => _isLoadingGoogle = false);
                    }
                  },
                  child: _isLoadingGoogle
                    ? const SizedBox(
                        width: 20,
                        height: 20,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : FaIcon(FontAwesomeIcons.google),
                )
              ),

              const SizedBox(height: 30),

              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text('¿No tienes cuenta?', style: TextStyle(color: AppTheme.secondaryColor)),
                  TextButton(
                    onPressed: () => Navigator.pushNamed(context, 'register'),
                    child: const Text(
                      'Regístrate aquí',
                      style: TextStyle(
                        color: AppTheme.errorColor,
                        fontWeight: FontWeight.bold
                      )
                    ),
                  ),
                ],
              ),
          ]),
        ),
      ),
    );
  }
}