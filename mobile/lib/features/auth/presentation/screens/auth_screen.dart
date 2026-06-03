import 'dart:async';
import 'package:flutter/material.dart';
import '../../../../core/auth/auth_session.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_spacing.dart';

class AuthScreen extends StatefulWidget {
  const AuthScreen({super.key, required this.session});

  final AuthSession session;

  @override
  State<AuthScreen> createState() => _AuthScreenState();
}

class _AuthScreenState extends State<AuthScreen> {
  bool _isSignup = false;
  bool _isAuthBusy = false;
  bool _needsEmailCode = false;
  int _step = 0;
  String _role = 'fan';
  Timer? _usernameTimer;
  bool? _usernameAvailable;
  List<String> _usernameSuggestions = [];

  final _email = TextEditingController();
  final _password = TextEditingController();
  final _name = TextEditingController();
  final _phone = TextEditingController();
  final _country = TextEditingController(text: 'India');
  final _username = TextEditingController();
  final _bio = TextEditingController();
  final _code = TextEditingController();
  String? _authMessage;

  @override
  void dispose() {
    _usernameTimer?.cancel();
    _email.dispose();
    _password.dispose();
    _name.dispose();
    _phone.dispose();
    _country.dispose();
    _username.dispose();
    _bio.dispose();
    _code.dispose();
    super.dispose();
  }

  Future<void> _submitLogin() async {
    final email = _email.text.trim().toLowerCase();
    final password = _password.text;

    setState(() {
      _isAuthBusy = true;
      _authMessage = null;
    });

    final success = await widget.session.login(
      email: email,
      password: password,
    );
    if (!mounted) return;
    if (!success) {
      setState(() {
        _authMessage =
            widget.session.errorMessage ?? 'account was not found. check email and password.';
      });
    }
    setState(() => _isAuthBusy = false);
  }

  Future<void> _submitSignup() async {
    if (_needsEmailCode) {
      await _verifySignupCode();
      return;
    }

    if (_step < 3) {
      setState(() => _step += 1);
      if (_step == 3) _checkUsername();
      return;
    }

    setState(() {
      _isAuthBusy = true;
      _authMessage = null;
    });

    final success = await widget.session.startRegistration(
      role: _role,
      displayName: _name.text,
      email: _email.text,
      phone: _phone.text,
      country: _country.text,
      username: _username.text,
      password: _password.text,
      bio: _bio.text,
    );
    if (!mounted) return;
    if (success) {
      setState(() {
        _needsEmailCode = true;
        _authMessage = 'enter the verification code sent to your email';
      });
    } else {
      setState(() {
        _authMessage =
            widget.session.errorMessage ?? 'could not send verification code.';
      });
    }
    setState(() => _isAuthBusy = false);
  }

  Future<void> _verifySignupCode() async {
    final code = _code.text.trim();
    if (code.length < 4) return;

    setState(() {
      _isAuthBusy = true;
      _authMessage = null;
    });

    final success = await widget.session.verifyRegistration(
      email: _email.text,
      code: code,
    );
    if (!mounted) return;
    if (!success) {
      setState(() {
        _authMessage =
            widget.session.errorMessage ?? 'verification failed. check the code and retry.';
      });
    }
    setState(() => _isAuthBusy = false);
  }

  void _checkUsername() {
    _usernameTimer?.cancel();
    final value = _username.text.trim();
    if (value.length < 3) {
      setState(() {
        _usernameAvailable = null;
        _usernameSuggestions = [];
      });
      return;
    }
    _usernameTimer = Timer(const Duration(milliseconds: 350), () async {
      try {
        final result = await widget.session.checkUsername(value);
        if (!mounted) return;
        setState(() {
          _usernameAvailable = result['available'] == true;
          _usernameSuggestions =
              (result['suggestions'] as List? ?? []).map((e) => '$e').toList();
        });
      } catch (_) {
        if (!mounted) return;
        setState(() => _usernameAvailable = false);
      }
    });
  }

  bool get _canContinue {
    if (_needsEmailCode) return _code.text.trim().length >= 4;
    if (!_isSignup) return _email.text.isNotEmpty && _password.text.length >= 8;
    if (_step == 0) return true;
    if (_step == 1) {
      return _name.text.trim().length >= 2 &&
          _email.text.contains('@') &&
          _password.text.length >= 8;
    }
    if (_step == 2) {
      return _phone.text.trim().length >= 7 && _country.text.trim().isNotEmpty;
    }
    return _usernameAvailable == true;
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final primary = isDark ? AppColors.darkPrimary : AppColors.lightPrimary;

    return Scaffold(
      body: SafeArea(
        child: AnimatedBuilder(
          animation: widget.session,
          builder: (context, _) => ListView(
            padding: const EdgeInsets.all(20),
            children: [
              const SizedBox(height: 18),
              const Text(
                'felbic',
                style: TextStyle(
                  color: AppColors.lightPrimary,
                  fontSize: 24,
                  fontWeight: FontWeight.w900,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                _needsEmailCode
                    ? 'verify your email'
                    : (_isSignup ? 'create your account' : 'sign in'),
                style:
                    const TextStyle(fontSize: 22, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 6),
              Text(
                _isSignup
                    ? 'enter the code sent to your inbox.'
                    : (_isSignup
                        ? 'create one Felbic account for web and mobile.'
                        : 'sign in with your Felbic account.'),
                style: TextStyle(
                  color: isDark
                      ? AppColors.darkTextMuted
                      : AppColors.lightTextMuted,
                  fontSize: 13,
                ),
              ),
              const SizedBox(height: 22),
              if (_isSignup && !_needsEmailCode) _Progress(step: _step),
              if (_isSignup && !_needsEmailCode) const SizedBox(height: 18),
              if (_needsEmailCode)
                _buildCodeForm()
              else if (_isSignup)
                _buildSignupStep(primary)
              else
                _buildLoginForm(),
              if (_authMessage != null ||
                  widget.session.errorMessage != null) ...[
                AppSpacing.gapMD,
                Text(
                  _authMessage ?? widget.session.errorMessage!,
                  style: TextStyle(
                    color: Theme.of(context).colorScheme.error,
                    fontWeight: FontWeight.w600,
                    fontSize: 12,
                  ),
                ),
              ],
              AppSpacing.gapLG,
              FilledButton(
                onPressed:
                    widget.session.isLoading || _isAuthBusy || !_canContinue
                        ? null
                        : (_isSignup ? _submitSignup : _submitLogin),
                child: widget.session.isLoading || _isAuthBusy
                    ? const SizedBox(
                        width: 18,
                        height: 18,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : Text(_needsEmailCode
                        ? 'verify and continue'
                        : (_isSignup
                            ? (_step == 3 ? 'create account' : 'continue')
                            : 'sign in')),
              ),
              if (_isSignup && _step > 0 && !_needsEmailCode)
                TextButton(
                  onPressed: () => setState(() => _step -= 1),
                  child: const Text('back'),
                ),
              TextButton(
                onPressed: () {
                  setState(() {
                    _isSignup = !_isSignup;
                    _needsEmailCode = false;
                    _authMessage = null;
                    _step = 0;
                  });
                },
                child: Text(_isSignup
                    ? 'already have an account? sign in'
                    : 'new here? create account'),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildLoginForm() {
    return Column(
      children: [
        TextField(
          controller: _email,
          keyboardType: TextInputType.emailAddress,
          onChanged: (_) => setState(() {}),
          decoration: const InputDecoration(
            labelText: 'Email',
            prefixIcon: Icon(Icons.mail_outline_rounded),
          ),
        ),
        AppSpacing.gapMD,
        TextField(
          controller: _password,
          obscureText: true,
          onChanged: (_) => setState(() {}),
          decoration: const InputDecoration(
            labelText: 'Password',
            prefixIcon: Icon(Icons.lock_outline_rounded),
          ),
        ),
      ],
    );
  }

  Widget _buildSignupStep(Color primary) {
    if (_step == 0) {
      return Column(
        children: [
          _RoleTile(
            title: 'Visitor',
            subtitle: 'Follow creators, unlock posts, comment, like, and chat.',
            icon: Icons.person_outline_rounded,
            selected: _role == 'fan',
            onTap: () => setState(() => _role = 'fan'),
          ),
          AppSpacing.gapSM,
          _RoleTile(
            title: 'Creator',
            subtitle:
                'Publish posts, stories, subscriptions, and manage media.',
            icon: Icons.auto_awesome_rounded,
            selected: _role == 'creator',
            onTap: () => setState(() => _role = 'creator'),
          ),
        ],
      );
    }
    if (_step == 1) {
      return Column(
        children: [
          TextField(
            controller: _name,
            onChanged: (_) => setState(() {}),
            decoration: const InputDecoration(
              labelText: 'Full name',
              prefixIcon: Icon(Icons.badge_outlined),
            ),
          ),
          AppSpacing.gapMD,
          TextField(
            controller: _email,
            keyboardType: TextInputType.emailAddress,
            onChanged: (_) => setState(() {}),
            decoration: const InputDecoration(
              labelText: 'Email',
              prefixIcon: Icon(Icons.mail_outline_rounded),
            ),
          ),
          AppSpacing.gapMD,
          TextField(
            controller: _password,
            obscureText: true,
            onChanged: (_) => setState(() {}),
            decoration: const InputDecoration(
              labelText: 'Password',
              helperText: 'At least 8 characters',
              prefixIcon: Icon(Icons.lock_outline_rounded),
            ),
          ),
        ],
      );
    }
    if (_step == 2) {
      return Column(
        children: [
          TextField(
            controller: _phone,
            keyboardType: TextInputType.phone,
            onChanged: (_) => setState(() {}),
            decoration: const InputDecoration(
              labelText: 'Mobile number',
              prefixIcon: Icon(Icons.phone_outlined),
            ),
          ),
          AppSpacing.gapMD,
          TextField(
            controller: _country,
            onChanged: (_) => setState(() {}),
            decoration: const InputDecoration(
              labelText: 'Country',
              prefixIcon: Icon(Icons.public_rounded),
            ),
          ),
          AppSpacing.gapMD,
          _InfoLine(
            icon: Icons.verified_user_outlined,
            text:
                'Email and mobile verification are captured in the account model. OTP delivery can be connected to your provider next.',
            color: primary,
          ),
        ],
      );
    }
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        TextField(
          controller: _username,
          onChanged: (_) {
            setState(() => _usernameAvailable = null);
            _checkUsername();
          },
          decoration: InputDecoration(
            labelText: 'Username',
            prefixText: '@',
            suffixIcon: _usernameAvailable == null
                ? null
                : Icon(
                    _usernameAvailable!
                        ? Icons.check_circle_rounded
                        : Icons.error_rounded,
                    color: _usernameAvailable!
                        ? AppColors.lightSuccess
                        : Theme.of(context).colorScheme.error,
                  ),
          ),
        ),
        if (_usernameAvailable == false && _usernameSuggestions.isNotEmpty) ...[
          AppSpacing.gapSM,
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: _usernameSuggestions
                .map(
                  (name) => ActionChip(
                    label: Text('@$name'),
                    onPressed: () {
                      _username.text = name;
                      _checkUsername();
                    },
                  ),
                )
                .toList(),
          ),
        ],
        if (_role == 'creator') ...[
          AppSpacing.gapMD,
          TextField(
            controller: _bio,
            minLines: 3,
            maxLines: 5,
            decoration: const InputDecoration(
              labelText: 'Creator bio',
              alignLabelWithHint: true,
            ),
          ),
        ],
      ],
    );
  }

  Widget _buildCodeForm() {
    return TextField(
      controller: _code,
      keyboardType: TextInputType.number,
      onChanged: (_) => setState(() {}),
      decoration: const InputDecoration(
        labelText: 'email code',
        prefixIcon: Icon(Icons.mark_email_read_outlined),
      ),
    );
  }
}

class _Progress extends StatelessWidget {
  const _Progress({required this.step});
  final int step;

  @override
  Widget build(BuildContext context) {
    const labels = ['Role', 'Identity', 'Verify', 'Username'];
    return Row(
      children: List.generate(labels.length, (index) {
        final active = index <= step;
        return Expanded(
          child: Column(
            children: [
              CircleAvatar(
                radius: 13,
                backgroundColor: active
                    ? Theme.of(context).primaryColor
                    : Theme.of(context).colorScheme.outline.withOpacity(0.25),
                child: Text(
                  '${index + 1}',
                  style: TextStyle(
                    color: active ? Colors.white : Colors.grey,
                    fontSize: 11,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
              const SizedBox(height: 5),
              Text(labels[index], style: const TextStyle(fontSize: 10)),
            ],
          ),
        );
      }),
    );
  }
}

class _RoleTile extends StatelessWidget {
  const _RoleTile({
    required this.title,
    required this.subtitle,
    required this.icon,
    required this.selected,
    required this.onTap,
  });

  final String title;
  final String subtitle;
  final IconData icon;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final primary = Theme.of(context).primaryColor;
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(8),
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(8),
          border: Border.all(color: selected ? primary : Colors.grey.shade300),
        ),
        child: Row(
          children: [
            Icon(icon, color: selected ? primary : null),
            AppSpacing.gapMD,
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(title,
                      style: const TextStyle(fontWeight: FontWeight.bold)),
                  const SizedBox(height: 3),
                  Text(subtitle, style: const TextStyle(fontSize: 12)),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _InfoLine extends StatelessWidget {
  const _InfoLine({
    required this.icon,
    required this.text,
    required this.color,
  });

  final IconData icon;
  final String text;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Icon(icon, color: color, size: 18),
        AppSpacing.gapSM,
        Expanded(child: Text(text, style: const TextStyle(fontSize: 12))),
      ],
    );
  }
}
