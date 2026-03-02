import 'package:flutter/material.dart';

class HomeScreen extends StatelessWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      //AppBar omitido
      body: SafeArea(
        child: Padding(
          padding: EdgeInsetsGeometry.symmetric(horizontal: 24),
          child: Column(
            children: [
              Spacer(), //ocupa el espacio y empuja el resto de elementos al fondo de la pagina

              //LOGO
              Container(
                padding: EdgeInsets.all(35),
                decoration: BoxDecoration(
                  color: const Color.fromARGB(255, 226, 226, 226),
                  shape: BoxShape.circle,
                ),
                child: Icon(
                  Icons.add_box,
                  size: 80,
                  color: Colors.green,
                ),
              ),

              SizedBox(height: 40,), //espacio

              //NOMBRE APP
              Text(
                'Gestion API Rest',
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontSize: 15,
                  color: Colors.green
                ),
              ),

              Spacer(),

              //BOTONES LOGIN/SINGUP
              Column(
                crossAxisAlignment: CrossAxisAlignment.stretch, //los hijos ocupen todo el ancho del column
                children: [
                  ElevatedButton(
                    onPressed: () => {},
                    child: Text('INICIAR SESION'),
                  ),

                  SizedBox(height: 15,),

                  ElevatedButton(
                    onPressed: () => {},
                    child: Text('REGISTRO'),
                  ),

                ],
              ),
              SizedBox(height: 40,)
            ],
          ),),
      ),
    );
  }
}