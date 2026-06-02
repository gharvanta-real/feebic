import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:feebic_mobile/features/shared/widgets/verified_badge.dart';
import 'package:feebic_mobile/features/shared/widgets/user_avatar.dart';
import 'package:feebic_mobile/features/profile/presentation/screens/creator_profile_details_screen.dart';
import '../../../../core/cubit/user_mode_cubit.dart';
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

  @override
  void initState() {
    super.initState();
    _searchFocusNode.addListener(_onFocusChange);
  }

  @override
  void dispose() {
    _searchFocusNode.removeListener(_onFocusChange);
    _searchFocusNode.dispose();
    super.dispose();
  }

  void _onFocusChange() {
    setState(() {});
  }

  final List<Map<String, dynamic>> _creators = [
    {
      'name': 'Lucia Fernandez',
      'handle': 'lucia_fit',
      'followers': '12.4K',
      'avatar': 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1',
      'verified': true,
      'category': 'Fitness',
    },
    {
      'name': 'Alexandra Art',
      'handle': 'alexandra_art',
      'followers': '9.8K',
      'avatar': 'https://images.unsplash.com/photo-1494790108377-be9c29b29330',
      'verified': true,
      'category': 'Art',
    },
    {
      'name': 'Chef Gabriel',
      'handle': 'chef_g',
      'followers': '15.1K',
      'avatar': 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e',
      'verified': true,
      'category': 'Cooking',
    },
    {
      'name': 'Sam Fitness',
      'handle': 'sam_fit',
      'followers': '8.2K',
      'avatar': 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d',
      'verified': false,
      'category': 'Fitness',
    },
  ];

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
      final nameMatches = (creator['name'] as String)
              .toLowerCase()
              .contains(_searchQuery.toLowerCase()) ||
          (creator['handle'] as String)
              .toLowerCase()
              .contains(_searchQuery.toLowerCase());
      final categoryMatches = _selectedCategory == 'All' ||
          creator['category'] == _selectedCategory;
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
                    child: AnimatedContainer(
                      duration: const Duration(milliseconds: 200),
                      decoration: BoxDecoration(
                        color: isDark
                            ? AppColors.darkBorder.withOpacity(0.3)
                            : AppColors.lightBorder.withOpacity(0.3),
                        borderRadius: AppRadius.rSM,
                        border: Border.all(
                          color: _searchFocusNode.hasFocus
                              ? (isDark ? AppColors.darkPrimary : AppColors.lightPrimary)
                              : Colors.transparent,
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
                            color: isDark
                                ? AppColors.darkTextMuted
                                : AppColors.lightTextMuted,
                            fontSize: 14,
                          ),
                          prefixIcon: Icon(
                            Icons.search,
                            color: _searchFocusNode.hasFocus
                                ? (isDark ? AppColors.darkPrimary : AppColors.lightPrimary)
                                : (isDark
                                    ? AppColors.darkTextMuted
                                    : AppColors.lightTextMuted),
                          ),
                          border: InputBorder.none,
                          contentPadding: const EdgeInsets.symmetric(
                              vertical: AppSpacing.sm),
                        ),
                      ),
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
              child: filteredCreators.isEmpty
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
                      padding:
                          const EdgeInsets.symmetric(horizontal: AppSpacing.md),
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
                                builder: (context) => CreatorProfileDetailsScreen(
                                  username: creator['name'] as String,
                                  avatarUrl: creator['avatar'] as String,
                                  isVerified: creator['verified'] as bool,
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
                                    : AppColors.lightBorder.withOpacity(0.5),
                              ),
                            ),
                            padding: AppSpacing.pAllSM,
                            child: Column(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                UserAvatar(
                                  imageUrl: creator['avatar'] as String,
                                  radius: 36,
                                ),
                                AppSpacing.gapSM,
                                Row(
                                  mainAxisAlignment: MainAxisAlignment.center,
                                  children: [
                                    Flexible(
                                      child: Text(
                                        creator['name'] as String,
                                        style: const TextStyle(
                                            fontWeight: FontWeight.bold,
                                            fontSize: 13),
                                        overflow: TextOverflow.ellipsis,
                                      ),
                                    ),
                                    if (creator['verified'] == true)
                                      const VerifiedBadge(),
                                  ],
                                ),
                                AppSpacing.gapXXS,
                                Text(
                                  '@${creator['handle']}',
                                  style: TextStyle(
                                    color: isDark
                                        ? AppColors.darkTextMuted
                                        : AppColors.lightTextMuted,
                                    fontSize: 11,
                                  ),
                                ),
                                AppSpacing.gapSM,
                                Text(
                                  '${creator['followers']} followers',
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
        title: const Text('Insights & Trends',
            style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
      ),
      body: ListView(
        padding: AppSpacing.pAllMD,
        children: [
          const Text(
            'Trending Niche Keywords',
            style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
          ),
          AppSpacing.gapSM,
          _buildKeywordItem(
              'Fitness plans 2026', 'Up +45% in search volume', true, isDark),
          _buildKeywordItem(
              'ASMR streams', 'Up +22% in search volume', true, isDark),
          _buildKeywordItem(
              'Oil Painting tutorials', 'Stable volume', false, isDark),
          AppSpacing.gapLG,
          const Text(
            'Top Performing Categories',
            style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
          ),
          AppSpacing.gapSM,
          _buildCategoryRank(
              '1', 'Fitness & Nutrition', '8.4M monthly interactions', isDark),
          _buildCategoryRank('2', 'Digital Art & Shaders',
              '6.2M monthly interactions', isDark),
          _buildCategoryRank('3', 'Home cooking tutorials',
              '3.1M monthly interactions', isDark),
        ],
      ),
    );
  }

  Widget _buildCategoriesRow(bool isDark) {
    final categories = ['All', 'Fitness', 'Art', 'Cooking', 'Music'];
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
                      ? (isDark ? AppColors.darkPrimary : AppColors.lightPrimary)
                      : (isDark
                          ? AppColors.darkBorder
                          : AppColors.lightBorder.withOpacity(0.3)),
                  borderRadius: AppRadius.rFull,
                  border: Border.all(
                    color: isSelected
                        ? Colors.transparent
                        : (isDark ? AppColors.darkBorder : AppColors.lightBorder.withOpacity(0.5)),
                    width: 0.8,
                  ),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    if (isSelected) ...[
                      const Icon(Icons.check_rounded, color: Colors.white, size: 12),
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
                        fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
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

  Widget _buildKeywordItem(
      String keyword, String stats, bool isUp, bool isDark) {
    return ListTile(
      contentPadding: EdgeInsets.zero,
      title: Text(keyword,
          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
      subtitle: Text(stats,
          style: TextStyle(
              color:
                  isDark ? AppColors.darkTextMuted : AppColors.lightTextMuted,
              fontSize: 12)),
      trailing: isUp
          ? Icon(Icons.trending_up_rounded,
              color: isDark ? AppColors.darkSuccess : AppColors.lightSuccess)
          : Icon(Icons.remove_rounded,
              color:
                  isDark ? AppColors.darkTextMuted : AppColors.lightTextMuted),
    );
  }

  Widget _buildCategoryRank(
      String rank, String title, String stats, bool isDark) {
    return Container(
      margin: const EdgeInsets.only(bottom: AppSpacing.sm),
      padding: AppSpacing.pAllSM,
      decoration: BoxDecoration(
        color: isDark
            ? AppColors.darkBorder.withOpacity(0.2)
            : AppColors.lightBorder.withOpacity(0.15),
        borderRadius: AppRadius.rSM,
        border: Border.all(
          color: isDark
              ? AppColors.darkBorder
              : AppColors.lightBorder.withOpacity(0.2),
        ),
      ),
      child: Row(
        children: [
          CircleAvatar(
            radius: 14,
            backgroundColor:
                isDark ? AppColors.darkPrimary : AppColors.lightPrimary,
            child: Text(rank,
                style: const TextStyle(
                    color: Colors.white,
                    fontSize: 12,
                    fontWeight: FontWeight.bold)),
          ),
          AppSpacing.gapSM,
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(title,
                  style: const TextStyle(
                      fontWeight: FontWeight.bold, fontSize: 13)),
              AppSpacing.gapXXS,
              Text(stats,
                  style: TextStyle(
                      color: isDark
                          ? AppColors.darkTextMuted
                          : AppColors.lightTextMuted,
                      fontSize: 11)),
            ],
          ),
        ],
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
  State<PressableScaleContainer> createState() => _PressableScaleContainerState();
}

class _PressableScaleContainerState extends State<PressableScaleContainer> with SingleTickerProviderStateMixin {
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
