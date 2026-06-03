import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:felbic_mobile/features/shared/widgets/verified_badge.dart';
import 'package:felbic_mobile/features/shared/widgets/user_avatar.dart';
import 'package:felbic_mobile/features/profile/presentation/screens/creator_profile_details_screen.dart';
import '../../../../core/cubit/user_mode_cubit.dart';
import '../../../../core/di/injection.dart';
import '../../../../core/network/api_client.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_spacing.dart';
import '../../../../core/theme/app_radius.dart';

class ExploreScreen extends StatefulWidget {
  const ExploreScreen({super.key});

  @override
  State<ExploreScreen> createState() => _ExploreScreenState();
}

class _ExploreScreenState extends State<ExploreScreen> {
  String _searchQuery = '';
  String _selectedCategory = 'All';
  final FocusNode _searchFocusNode = FocusNode();
  bool _isLoading = false;
  List<Map<String, dynamic>> _creators = [];

  @override
  void initState() {
    super.initState();
    _fetchCreators();
  }

  @override
  void dispose() {
    _searchFocusNode.dispose();
    super.dispose();
  }

  Future<void> _fetchCreators() async {
    setState(() => _isLoading = true);
    try {
      final response = await getIt<ApiClient>().get('/users/creators');
      final data = response.data is List ? response.data as List : <dynamic>[];
      if (!mounted) return;
      setState(() {
        _creators = data
            .whereType<Map>()
            .map((item) => Map<String, dynamic>.from(item))
            .toList();
      });
    } catch (e) {
      debugPrint('Error loading creators: $e');
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return BlocBuilder<UserModeCubit, UserMode>(
      builder: (context, mode) {
        if (mode == UserMode.creator) {
          return _buildCreatorExplore(context);
        } else {
          return _buildFanExplore(context);
        }
      },
    );
  }

  // --- FAN EXPLORE VIEW (DISCOVER CREATORS) ---
  Widget _buildFanExplore(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    // Filter creators based on search query and selected category chip
    final filteredCreators = _creators.where((creator) {
      final name = (creator['display_name'] ?? '').toString();
      final handle = (creator['username'] ?? '').toString();
      final nameMatches =
          name.toLowerCase().contains(_searchQuery.toLowerCase()) ||
              handle.toLowerCase().contains(_searchQuery.toLowerCase());
      final categoryMatches = _selectedCategory == 'All';
      return nameMatches && categoryMatches;
    }).toList();

    return Scaffold(
      body: SafeArea(
        child: Column(
          children: [
            // Search Input Row with Theme Toggle
            Padding(
              padding: AppSpacing.pAllMD,
              child: Row(
                children: [
                  Expanded(
                    child: AnimatedBuilder(
                      animation: _searchFocusNode,
                      builder: (context, child) {
                        final hasFocus = _searchFocusNode.hasFocus;
                        final focusColor = isDark
                            ? AppColors.darkPrimary
                            : AppColors.lightPrimary;
                        final mutedColor = isDark
                            ? AppColors.darkTextMuted
                            : AppColors.lightTextMuted;

                        return AnimatedContainer(
                          duration: const Duration(milliseconds: 200),
                          decoration: BoxDecoration(
                            color: isDark
                                ? AppColors.darkBorder.withOpacity(0.3)
                                : AppColors.lightBorder.withOpacity(0.3),
                            borderRadius: AppRadius.rSM,
                            border: Border.all(
                              color: hasFocus ? focusColor : Colors.transparent,
                              width: 1.2,
                            ),
                          ),
                          child: TextField(
                            focusNode: _searchFocusNode,
                            onChanged: (val) {
                              setState(() {
                                _searchQuery = val;
                              });
                            },
                            style: TextStyle(
                                color: isDark
                                    ? AppColors.darkTextMain
                                    : AppColors.lightTextMain,
                                fontSize: 14),
                            decoration: InputDecoration(
                              hintText: 'Search creators, styles...',
                              hintStyle: TextStyle(
                                color: mutedColor,
                                fontSize: 14,
                              ),
                              prefixIcon: Icon(
                                Icons.search,
                                color: hasFocus ? focusColor : mutedColor,
                              ),
                              border: InputBorder.none,
                              contentPadding: const EdgeInsets.symmetric(
                                  vertical: AppSpacing.sm),
                            ),
                          ),
                        );
                      },
                    ),
                  ),
                ],
              ),
            ),

            // Interactive Categories
            _buildCategoriesRow(isDark),
            AppSpacing.gapSM,

            // Creator Discovery Grid
            Expanded(
              child: _isLoading
                  ? const Center(child: CircularProgressIndicator())
                  : filteredCreators.isEmpty
                      ? Center(
                          child: Text(
                            'No creators found.',
                            style: TextStyle(
                              color: isDark
                                  ? AppColors.darkTextMuted
                                  : AppColors.lightTextMuted,
                            ),
                          ),
                        )
                      : GridView.builder(
                          padding: const EdgeInsets.symmetric(
                              horizontal: AppSpacing.md),
                          gridDelegate:
                              const SliverGridDelegateWithFixedCrossAxisCount(
                            crossAxisCount: 2,
                            crossAxisSpacing: AppSpacing.sm,
                            mainAxisSpacing: AppSpacing.sm,
                            childAspectRatio: 0.85,
                          ),
                          itemCount: filteredCreators.length,
                          itemBuilder: (context, index) {
                            final creator = filteredCreators[index];

                            return PressableScaleContainer(
                              onTap: () {
                                HapticFeedback.lightImpact();
                                Navigator.push(
                                  context,
                                  MaterialPageRoute(
                                    builder: (context) =>
                                        CreatorProfileDetailsScreen(
                                      username: creator['username'] as String,
                                      avatarUrl: ApiClient.resolveUrl(
                                          (creator['avatar'] ?? '').toString()),
                                      isVerified: true,
                                    ),
                                  ),
                                );
                              },
                              child: Container(
                                decoration: BoxDecoration(
                                  color: isDark
                                      ? AppColors.darkBorder.withOpacity(0.15)
                                      : AppColors.lightBackground,
                                  borderRadius: AppRadius.rMD,
                                  border: Border.all(
                                    color: isDark
                                        ? AppColors.darkBorder
                                        : AppColors.lightBorder
                                            .withOpacity(0.5),
                                  ),
                                ),
                                padding: AppSpacing.pAllSM,
                                child: Column(
                                  mainAxisAlignment: MainAxisAlignment.center,
                                  children: [
                                    UserAvatar(
                                      imageUrl: ApiClient.resolveUrl(
                                          (creator['avatar'] ?? '').toString()),
                                      radius: 36,
                                    ),
                                    AppSpacing.gapSM,
                                    Row(
                                      mainAxisAlignment:
                                          MainAxisAlignment.center,
                                      children: [
                                        Flexible(
                                          child: Text(
                                            creator['display_name'] as String,
                                            style: const TextStyle(
                                                fontWeight: FontWeight.bold,
                                                fontSize: 13),
                                            overflow: TextOverflow.ellipsis,
                                          ),
                                        ),
                                        const VerifiedBadge(),
                                      ],
                                    ),
                                    AppSpacing.gapXXS,
                                    Text(
                                      '@${creator['username']}',
                                      style: TextStyle(
                                        color: isDark
                                            ? AppColors.darkTextMuted
                                            : AppColors.lightTextMuted,
                                        fontSize: 11,
                                      ),
                                    ),
                                    AppSpacing.gapSM,
                                    Text(
                                      'Rs ${((creator['sub_price'] ?? 0) as num).toStringAsFixed(0)} / month',
                                      style: TextStyle(
                                        fontWeight: FontWeight.bold,
                                        fontSize: 12,
                                        color: isDark
                                            ? AppColors.darkPrimary
                                            : AppColors.lightPrimary,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            );
                          },
                        ),
            ),
          ],
        ),
      ),
    );
  }

  // --- CREATOR EXPLORE VIEW (TRENDING AND KEYWORDS) ---
  Widget _buildCreatorExplore(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Scaffold(
      appBar: AppBar(
        title: const Text('Creator tools',
            style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
      ),
      body: ListView(
        padding: AppSpacing.pAllMD,
        children: [
          Icon(Icons.insights_rounded,
              color: isDark ? AppColors.darkPrimary : AppColors.lightPrimary,
              size: 36),
          AppSpacing.gapSM,
          const Text('Insights will appear after real account activity.',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
          AppSpacing.gapXS,
          Text(
            'Publish posts, collect followers, and receive interactions to populate this view.',
            style: TextStyle(
                color: isDark
                    ? AppColors.darkTextMuted
                    : AppColors.lightTextMuted),
          ),
        ],
      ),
    );
  }

  Widget _buildCategoriesRow(bool isDark) {
    final categories = ['All'];
    return SizedBox(
      height: 36,
      child: ListView.builder(
        scrollDirection: Axis.horizontal,
        itemCount: categories.length,
        padding: const EdgeInsets.only(left: AppSpacing.md),
        itemBuilder: (context, index) {
          final cat = categories[index];
          final isSelected = _selectedCategory == cat;

          return GestureDetector(
            onTap: () {
              HapticFeedback.selectionClick();
              setState(() {
                _selectedCategory = cat;
              });
            },
            child: AnimatedScale(
              scale: isSelected ? 1.05 : 1.0,
              duration: const Duration(milliseconds: 150),
              curve: Curves.easeOutCubic,
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 200),
                margin: const EdgeInsets.only(right: AppSpacing.xs),
                padding: const EdgeInsets.symmetric(horizontal: AppSpacing.md),
                decoration: BoxDecoration(
                  color: isSelected
                      ? (isDark
                          ? AppColors.darkPrimary
                          : AppColors.lightPrimary)
                      : (isDark
                          ? AppColors.darkBorder
                          : AppColors.lightBorder.withOpacity(0.3)),
                  borderRadius: AppRadius.rFull,
                  border: Border.all(
                    color: isSelected
                        ? Colors.transparent
                        : (isDark
                            ? AppColors.darkBorder
                            : AppColors.lightBorder.withOpacity(0.5)),
                    width: 0.8,
                  ),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    if (isSelected) ...[
                      const Icon(Icons.check_rounded,
                          color: Colors.white, size: 12),
                      const SizedBox(width: 4),
                    ],
                    Text(
                      cat,
                      style: TextStyle(
                        color: isSelected
                            ? Colors.white
                            : (isDark
                                ? AppColors.darkTextMain
                                : AppColors.lightTextMain),
                        fontWeight:
                            isSelected ? FontWeight.bold : FontWeight.w500,
                        fontSize: 11.5,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          );
        },
      ),
    );
  }
}

class PressableScaleContainer extends StatefulWidget {
  const PressableScaleContainer({
    super.key,
    required this.child,
    required this.onTap,
  });

  final Widget child;
  final VoidCallback onTap;

  @override
  State<PressableScaleContainer> createState() =>
      _PressableScaleContainerState();
}

class _PressableScaleContainerState extends State<PressableScaleContainer>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _scale;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 120),
    );
    _scale = Tween<double>(begin: 1.0, end: 0.96).animate(
      CurvedAnimation(parent: _controller, curve: Curves.easeOut),
    );
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTapDown: (_) => _controller.forward(),
      onTapUp: (_) {
        _controller.reverse();
        widget.onTap();
      },
      onTapCancel: () => _controller.reverse(),
      child: ScaleTransition(
        scale: _scale,
        child: widget.child,
      ),
    );
  }
}
