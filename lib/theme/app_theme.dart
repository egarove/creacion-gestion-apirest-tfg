import 'package:flutter/material.dart';

class AppTheme {
  static const Color primaryColor = Color(0xFF6B7280);
  static const Color secondaryColor = Color(0xFF9CA3AF);
  static const Color backgroundColor = Color(0xFFF9FAFB);
  static const Color surfaceColor = Color(0xFFFFFFFF);
  static const Color errorColor = Color(0xFEF87171);

  static ThemeData lightTheme() {
    return ThemeData(
      scaffoldBackgroundColor: backgroundColor,

      //APPBAR
      appBarTheme: const AppBarTheme(
        backgroundColor: surfaceColor,
        elevation: 0,
        iconTheme: IconThemeData(color: primaryColor),
      ),

      //INPUTS DE FORMS
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: surfaceColor,
        contentPadding: const EdgeInsets.symmetric(vertical: 12, horizontal: 16),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(8),
          borderSide: const BorderSide(color: secondaryColor),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(8),
          borderSide: const BorderSide(color: secondaryColor),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(8),
          borderSide: const BorderSide(color: primaryColor, width: 2),
        ),
      ),

      //BOTONES
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: primaryColor,
          foregroundColor: Colors.white,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
          padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 24),
        ),
      ),

      //TEXTO
      textTheme: const TextTheme(
        headlineLarge: TextStyle(color: primaryColor, fontWeight: FontWeight.bold),
        bodyMedium: TextStyle(color: primaryColor),
        bodySmall: TextStyle(color: secondaryColor),
      ),

      //ICONOS
      iconTheme: const IconThemeData(color: primaryColor),
    );
  }
}