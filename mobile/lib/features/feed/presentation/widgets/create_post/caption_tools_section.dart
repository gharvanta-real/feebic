import 'package:flutter/material.dart';
import '../../../../../core/theme/app_colors.dart';
import '../../../../../core/theme/app_spacing.dart';
import 'create_post_section.dart';

class CaptionToolsSection extends StatelessWidget {
  const CaptionToolsSection({
    super.key,
    required this.captionController,
    required this.tags,
    required this.pollEnabled,
    required this.scheduled,
    required this.scheduleText,
    required this.pollOptions,
    required this.onTagSelected,
    required this.onPollChanged,
    required this.onScheduledChanged,
    required this.onAddPollOption,
    required this.onRemovePollOption,
  });

  final TextEditingController captionController;
  final List<String> tags;
  final bool pollEnabled;
  final bool scheduled;
  final String scheduleText;
  final List<TextEditingController> pollOptions;
  final ValueChanged<String> onTagSelected;
  final ValueChanged<bool> onPollChanged;
  final ValueChanged<bool> onScheduledChanged;
  final VoidCallback onAddPollOption;
  final ValueChanged<int> onRemovePollOption;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        CreatePostSection(
          title: 'Caption',
          subtitle: 'Write the feed text fans see under the post.',
          icon: Icons.notes_rounded,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              TextField(
                controller: captionController,
                minLines: 4,
                maxLines: 7,
                decoration: const InputDecoration(
                  hintText: 'Describe what fans unlock...',
                ),
              ),
              AppSpacing.gapSM,
              Wrap(
                spacing: AppSpacing.xs,
                runSpacing: AppSpacing.xs,
                children: tags
                    .map(
                      (tag) => ActionChip(
                        label: Text('#$tag'),
                        avatar: const Icon(Icons.tag_rounded, size: 18),
                        onPressed: () => onTagSelected(tag),
                      ),
                    )
                    .toList(),
              ),
            ],
          ),
        ),
        CreatePostSection(
          title: 'Fan Tools',
          subtitle: 'Add engagement and scheduling tools.',
          icon: Icons.tune_rounded,
          child: Column(
            children: [
              SwitchListTile.adaptive(
                contentPadding: EdgeInsets.zero,
                value: pollEnabled,
                title: const Text('Add poll'),
                subtitle: const Text('Let subscribers vote on the next post.'),
                secondary: const Icon(Icons.poll_rounded, size: 24),
                onChanged: onPollChanged,
              ),
              if (pollEnabled) ...[
                AppSpacing.gapSM,
                ...List.generate(
                  pollOptions.length,
                  (index) => Padding(
                    padding: const EdgeInsets.only(bottom: AppSpacing.xs),
                    child: Row(
                      children: [
                        Expanded(
                          child: TextField(
                            controller: pollOptions[index],
                            decoration: InputDecoration(
                              labelText: 'Option ${index + 1}',
                              isDense: true,
                            ),
                          ),
                        ),
                        IconButton(
                          icon: const Icon(Icons.remove_circle_outline_rounded,
                              size: 22),
                          onPressed: pollOptions.length > 2
                              ? () => onRemovePollOption(index)
                              : null,
                        ),
                      ],
                    ),
                  ),
                ),
                Align(
                  alignment: Alignment.centerLeft,
                  child: TextButton.icon(
                    onPressed: pollOptions.length < 5 ? onAddPollOption : null,
                    icon: const Icon(Icons.add_rounded, size: 21),
                    label: const Text('Add option'),
                  ),
                ),
              ],
              const Divider(height: AppSpacing.lg),
              SwitchListTile.adaptive(
                contentPadding: EdgeInsets.zero,
                value: scheduled,
                title: const Text('Schedule post'),
                subtitle: Text(scheduled ? scheduleText : 'Publish now'),
                secondary: const Icon(Icons.calendar_month_rounded, size: 24),
                onChanged: onScheduledChanged,
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class MonetizationSection extends StatelessWidget {
  const MonetizationSection({
    super.key,
    required this.locked,
    required this.price,
    required this.blur,
    required this.watermarkEnabled,
    required this.watermarkController,
    required this.selectedTiers,
    required this.onLockedChanged,
    required this.onPriceChanged,
    required this.onBlurChanged,
    required this.onWatermarkChanged,
    required this.onWatermarkTextChanged,
    required this.onTierToggled,
  });

  final bool locked;
  final double price;
  final double blur;
  final bool watermarkEnabled;
  final TextEditingController watermarkController;
  final List<String> selectedTiers;
  final ValueChanged<bool> onLockedChanged;
  final ValueChanged<double> onPriceChanged;
  final ValueChanged<double> onBlurChanged;
  final ValueChanged<bool> onWatermarkChanged;
  final ValueChanged<String> onWatermarkTextChanged;
  final ValueChanged<String> onTierToggled;

  static const tiers = [
    'Free Subscribers',
    'VIP Tier',
    'Superfans',
  ];

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final primary = isDark ? AppColors.darkPrimary : AppColors.lightPrimary;
    final secondary = isDark ? AppColors.darkAccent : AppColors.lightAccent;

    return CreatePostSection(
      title: 'Access & Monetization',
      subtitle: 'Set PPV unlocks, tiers, preview blur, and watermarking.',
      icon: Icons.lock_rounded,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SwitchListTile.adaptive(
            contentPadding: EdgeInsets.zero,
            value: locked,
            title: const Text('Paid post'),
            subtitle: Text(locked
                ? 'Fans unlock this post for Rs ${price.round()}'
                : 'Visible to selected tiers'),
            secondary: Icon(Icons.payments_rounded,
                size: 24, color: locked ? secondary : null),
            onChanged: onLockedChanged,
          ),
          if (locked) ...[
            AppSpacing.gapSM,
            _SliderRow(
              label: 'Unlock price',
              valueLabel: 'Rs ${price.round()}',
              value: price,
              min: 99,
              max: 1999,
              divisions: 19,
              onChanged: onPriceChanged,
            ),
            _SliderRow(
              label: 'Preview blur',
              valueLabel: '${blur.round()} px',
              value: blur,
              min: 5,
              max: 30,
              divisions: 5,
              onChanged: onBlurChanged,
            ),
          ],
          AppSpacing.gapSM,
          Wrap(
            spacing: AppSpacing.xs,
            runSpacing: AppSpacing.xs,
            children: tiers.map((tier) {
              final selected = selectedTiers.contains(tier);
              return FilterChip(
                selected: selected,
                label: Text(tier),
                selectedColor: primary.withOpacity(0.12),
                checkmarkColor: primary,
                onSelected: (_) => onTierToggled(tier),
              );
            }).toList(),
          ),
          const Divider(height: AppSpacing.lg),
          SwitchListTile.adaptive(
            contentPadding: EdgeInsets.zero,
            value: watermarkEnabled,
            title: const Text('Watermark preview'),
            subtitle: const Text('Protect teaser media before unlock.'),
            secondary: const Icon(Icons.shield_outlined, size: 24),
            onChanged: onWatermarkChanged,
          ),
          if (watermarkEnabled)
            TextField(
              controller: watermarkController,
              decoration: const InputDecoration(labelText: 'Watermark text'),
              onChanged: onWatermarkTextChanged,
            ),
        ],
      ),
    );
  }
}

class _SliderRow extends StatelessWidget {
  const _SliderRow({
    required this.label,
    required this.valueLabel,
    required this.value,
    required this.min,
    required this.max,
    required this.divisions,
    required this.onChanged,
  });

  final String label;
  final String valueLabel;
  final double value;
  final double min;
  final double max;
  final int divisions;
  final ValueChanged<double> onChanged;

  @override
  Widget build(BuildContext context) {
    final primary = Theme.of(context).primaryColor;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Expanded(
              child: Text(label,
                  style: const TextStyle(
                      fontWeight: FontWeight.bold, fontSize: 12)),
            ),
            Text(valueLabel,
                style: TextStyle(fontWeight: FontWeight.bold, color: primary)),
          ],
        ),
        Slider(
          value: value,
          min: min,
          max: max,
          divisions: divisions,
          activeColor: primary,
          onChanged: onChanged,
        ),
      ],
    );
  }
}
