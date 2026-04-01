import 'dart:async';
import 'package:flutter/material.dart';

enum OAuthStrategy { google, apple, facebook, github }

class ClerkUser {
  final String id;
  final String? firstName;
  final String? lastName;
  final String? imageUrl;
  final List<String> emailAddresses;
  final String? primaryEmailAddressId;

  ClerkUser({
    required this.id,
    this.firstName,
    this.lastName,
    this.imageUrl,
    this.emailAddresses = const [],
    this.primaryEmailAddressId,
  });

  String get idString => id;
  String get fullName => "${firstName ?? ''} ${lastName ?? ''}".trim();

  // Mock primary email
  _ClerkEmailAddress? get primaryEmailAddress => emailAddresses.isNotEmpty
      ? _ClerkEmailAddress(emailAddress: emailAddresses.first)
      : null;
}

class _ClerkEmailAddress {
  final String emailAddress;
  _ClerkEmailAddress({required this.emailAddress});
}

class ClerkSession {
  final ClerkUser? user;
  ClerkSession({this.user});

  Future<String> getToken() async {
    return 'mock_token_123';
  }
}

class ClerkClient {
  final ClerkSession? activeSession;
  ClerkClient({this.activeSession});
}

class ClerkAuth extends InheritedWidget {
  final ClerkUser? user;
  final bool isLoaded;
  final String? publishableKey;
  
  const ClerkAuth({
    Key? key,
    this.user,
    this.isLoaded = true,
    this.publishableKey,
    required Widget child,
  }) : super(key: key, child: child);

  static String getCurrentUserId() => 'pranjal_001';
  static bool get isSignedIn => true;
  static String get currentUserEmail => 'pranjalmishra2409@gmail.com';

  static ClerkAuth? of(BuildContext context) {
    return context.dependOnInheritedWidgetOfExactType<ClerkAuth>();
  }

  static ClerkAuth optionalOf(BuildContext context) {
    return of(context) ??
        ClerkAuth(
          user: ClerkUser(id: 'mock_admin_id', firstName: 'Offline', emailAddresses: ['offline@local']),
          child: const SizedBox.shrink(),
        );
  }

  // Session getter
  static ClerkSession? get session => ClerkSession(
    user: ClerkUser(id: 'mock_admin_id', emailAddresses: ['admin@guardianpulse.app'])
  );

  // Instance session
  ClerkClient? get client => ClerkClient(activeSession: ClerkSession(user: user));

  Future<void> signOut() async {
    // Mock signOut
    await Future.delayed(const Duration(milliseconds: 300));
  }

  @override
  bool updateShouldNotify(ClerkAuth oldWidget) {
    return user != oldWidget.user || isLoaded != oldWidget.isLoaded;
  }
}

class ClerkSignInWithOAuthButton extends StatelessWidget {
  final OAuthStrategy strategy;
  final Widget Function(BuildContext context, Future<void> Function() signIn, bool isLoading) builder;

  const ClerkSignInWithOAuthButton({
    Key? key,
    required this.strategy,
    required this.builder,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return builder(context, () async {
      await Future.delayed(const Duration(milliseconds: 500));
    }, false);
  }
}

class ClerkSignInWithEmailButton extends StatelessWidget {
  final String email;
  final Widget Function(BuildContext context, Future<void> Function(String email) signIn, bool isLoading) builder;

  const ClerkSignInWithEmailButton({
    Key? key,
    required this.email,
    required this.builder,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return builder(context, (String email) async {
      await Future.delayed(const Duration(milliseconds: 500));
    }, false);
  }
}

class ClerkWidget extends StatelessWidget {
  final Widget child;
  final String? publishableKey;

  const ClerkWidget({
    Key? key, 
    this.publishableKey,
    required this.child
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    // Mock user for admin dashboard bypass
    final mockUser = ClerkUser(
      id: 'mock_admin_id',
      firstName: 'Admin',
      lastName: 'User',
      emailAddresses: ['admin@guardianpulse.app'],
    );

    return ClerkAuth(
      user: mockUser,
      isLoaded: true,
      publishableKey: publishableKey,
      child: child,
    );
  }
}

class SignedIn extends StatelessWidget {
  final Widget child;
  const SignedIn({Key? key, required this.child}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    final clerk = ClerkAuth.of(context);
    if (clerk != null && clerk.user != null) {
      return child;
    }
    return const SizedBox.shrink();
  }
}

class SignedOut extends StatelessWidget {
  final Widget child;
  const SignedOut({Key? key, required this.child}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    final clerk = ClerkAuth.of(context);
    if (clerk == null || clerk.user == null) {
      return child;
    }
    return const SizedBox.shrink();
  }
}

class Clerk {
  static Future<void> load() async {}
}
