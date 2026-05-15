import 'package:firebase_auth/firebase_auth.dart';
import 'package:google_sign_in/google_sign_in.dart';
import 'package:cloud_firestore/cloud_firestore.dart';

class AuthService {
  final FirebaseAuth _auth = FirebaseAuth.instance;
  final GoogleSignIn _googleSignIn = GoogleSignIn();
  final FirebaseFirestore _db = FirebaseFirestore.instance;

  // Guardar usuario en Firestore
  Future<void> _saveUserInFirestore(User user) async {
    final userDoc = _db.collection('usuarios').doc(user.uid);

    final docSnapshot = await userDoc.get();

    //Solo lo crea si no existe
    if (!docSnapshot.exists) {
      await userDoc.set({
        'uid': user.uid,
        'email': user.email,
        'createdAt': FieldValue.serverTimestamp(),
        'provider': user.providerData.isNotEmpty
            ? user.providerData.first.providerId
            : 'email',
      });
    }
  }

  // Registro con email
  Future<UserCredential?> registerWithEmail(String email, String password) async {
    final credential = await _auth.createUserWithEmailAndPassword(
      email: email,
      password: password,
    );

    // Guardar en Firestore
    await _saveUserInFirestore(credential.user!);

    return credential;
  }

  // Login con email
  Future<UserCredential?> signInWithEmail(String email, String password) async {
    final credential = await _auth.signInWithEmailAndPassword(
      email: email,
      password: password,
    );

    return credential;
  }

  // Google (login + registro automático)
  Future<UserCredential?> signInWithGoogle() async {
    final GoogleSignInAccount? googleUser = await _googleSignIn.signIn();
    if (googleUser == null) return null;

    final GoogleSignInAuthentication googleAuth =
        await googleUser.authentication;

    final credential = GoogleAuthProvider.credential(
      accessToken: googleAuth.accessToken,
      idToken: googleAuth.idToken,
    );

    final userCredential =
        await _auth.signInWithCredential(credential);

    //Guardar en Firestore
    await _saveUserInFirestore(userCredential.user!);

    return userCredential;
  }

  // Logout
  Future<void> signOut() async {
    await Future.wait([
      _auth.signOut(),
      _googleSignIn.signOut(),
    ]);
  }

  // Usuario actual
  User? get currentUser => _auth.currentUser;

  //mandar correo para reestablecer contraseña
  Future<void> sendPasswordResetEmail(String email) async {
    await _auth.sendPasswordResetEmail(email: email);
  }

  // Guardar API en Firestore (subcolección del usuario actual)
  Future<void> guardarApi(Map<String, dynamic> apiData) async {
    final uid = _auth.currentUser!.uid;
    final apiName = apiData['api_name'] as String;
    final data = <String, dynamic>{
      'api_name': apiData['api_name'],
      'port': apiData['port'],
      'backup_port': apiData['backup_port'] ?? (apiData['port'] as int) + 1,
      'db': apiData['db'],
      'usr': apiData['usr'] ?? '',
      'paswd': apiData['paswd'] ?? '',
      'columns': apiData['columns'],
      'tables': apiData['tables'] ?? [],
      'endpoints': apiData['endpoints'] ?? [],
      'createdAt': FieldValue.serverTimestamp(),
    };
    if (apiData['ui_url'] != null) {
      data['ui_url'] = apiData['ui_url'];
    }
    await _db
        .collection('usuarios')
        .doc(uid)
        .collection('apis')
        .doc(apiName)
        .set(data);
  }

  // Añadir un endpoint a la lista de endpoints de una API
  Future<void> agregarEndpointFirestore(
    String apiName,
    Map<String, dynamic> endpoint,
  ) async {
    final uid = _auth.currentUser!.uid;
    await _db
        .collection('usuarios')
        .doc(uid)
        .collection('apis')
        .doc(apiName)
        .update({
      'endpoints': FieldValue.arrayUnion([endpoint]),
    });
  }

  // Stream en tiempo real de las APIs del usuario actual
  Stream<QuerySnapshot> streamApis() {
    final uid = _auth.currentUser!.uid;
    return _db
        .collection('usuarios')
        .doc(uid)
        .collection('apis')
        .snapshots();
  }

  // Eliminar API de Firestore
  Future<void> eliminarApiFirestore(String apiName) async {
    final uid = _auth.currentUser!.uid;
    await _db
        .collection('usuarios')
        .doc(uid)
        .collection('apis')
        .doc(apiName)
        .delete();
  }
}