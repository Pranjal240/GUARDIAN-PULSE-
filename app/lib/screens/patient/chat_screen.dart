import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_animate/flutter_animate.dart';
import '../../core/constants.dart';
import '../../providers/sensor_providers.dart';
import '../../services/api_service.dart';
import '../../services/database_service.dart';

class ChatScreen extends ConsumerStatefulWidget {
  final String userId;
  const ChatScreen({super.key, required this.userId});

  @override
  ConsumerState<ChatScreen> createState() => _ChatScreenState();
}

class _ChatScreenState extends ConsumerState<ChatScreen>
    with SingleTickerProviderStateMixin {
  late final TabController _tabController;
  final _msgController = TextEditingController();
  bool _isTyping = false;
  final _scrollController = ScrollController();

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    _msgController.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  Future<void> _sendMessage() async {
    final text = _msgController.text.trim();
    if (text.isEmpty) return;
    _msgController.clear();

    await DatabaseService.instance.sendChatMessage({
      'userId': widget.userId,
      'message': text,
      'sender': 'user',
    });

    setState(() => _isTyping = true);
    try {
      final result = await ApiService.sendChatMessage(
        widget.userId,
        text,
        history: [],
      );
      final reply = result['response'] as String? ?? 'Sorry, I could not process that.';
      await DatabaseService.instance.sendChatMessage({
        'userId': widget.userId,
        'message': reply,
        'sender': 'ai',
      });
    } catch (e) {
      await DatabaseService.instance.sendChatMessage({
        'userId': widget.userId,
        'message': 'Sorry, I\'m having trouble connecting. Please try again.',
        'sender': 'ai',
      });
    } finally {
      if (mounted) setState(() => _isTyping = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: kBgApp,
      appBar: AppBar(
        title: const Text('AI Health Chat'),
        automaticallyImplyLeading: false,
        bottom: TabBar(
          controller: _tabController,
          indicatorColor: kBeige,
          indicatorWeight: 3,
          labelColor: kBeige,
          unselectedLabelColor: kTextMuted,
          tabs: const [
            Tab(text: 'Guardian AI 🫀'),
            Tab(text: 'Live Support'),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: [
          _buildAiTab(),
          _buildSupportTab(),
        ],
      ),
    );
  }

  Widget _buildAiTab() {
    final chatsAsync = ref.watch(chatMessagesProvider(widget.userId));
    final bpm = ref.watch(latestBpmProvider(widget.userId));

    return Column(
      children: [
        // ── Health Context Card ────────────────────
        Padding(
          padding: const EdgeInsets.all(kPad),
          child: Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: kBgCard,
              borderRadius: BorderRadius.circular(kCardRadius),
              border: Border(left: const BorderSide(color: kBeige, width: 3)),
            ),
            child: Row(
              children: [
                const Icon(Icons.monitor_heart, color: kBeige, size: 18),
                const SizedBox(width: 8),
                Text(
                  'Current BPM: $bpm',
                  style: const TextStyle(fontSize: 13, color: kTextSecondary),
                ),
                const Spacer(),
                Text('Context is shared with AI',
                    style: TextStyle(fontSize: 11, color: kTextMuted)),
              ],
            ),
          ),
        ).animate().fade(duration: 300.ms),

        // ── Messages ──────────────────────────────
        Expanded(
          child: chatsAsync.when(
            data: (messages) {
              final aiChats = messages.where((m) =>
                  m['sender'] == 'user' || m['sender'] == 'ai').toList();
              return ListView.builder(
                controller: _scrollController,
                padding: const EdgeInsets.symmetric(horizontal: kPad),
                itemCount: aiChats.length + (_isTyping ? 1 : 0),
                itemBuilder: (_, i) {
                  if (_isTyping && i == aiChats.length) {
                    return _buildTypingIndicator();
                  }
                  return _buildBubble(aiChats[i]);
                },
              );
            },
            loading: () => const Center(child: CircularProgressIndicator(color: kBeige)),
            error: (_, __) => const Center(child: Text('Failed to load messages')),
          ),
        ),

        // ── Input Bar ──────────────────────────────
        _buildInputBar(),
      ],
    );
  }

  Widget _buildSupportTab() {
    final chatsAsync = ref.watch(chatMessagesProvider(widget.userId));
    return Column(
      children: [
        Expanded(
          child: chatsAsync.when(
            data: (messages) {
              final support = messages
                  .where((m) => m['sender'] == 'user' || m['sender'] == 'admin')
                  .toList();
              if (support.isEmpty) {
                return Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Icon(Icons.support_agent, size: 48, color: kTextMuted),
                      const SizedBox(height: 12),
                      const Text('No active support conversation',
                          style: TextStyle(color: kTextSecondary)),
                      const SizedBox(height: 8),
                      Text('A healthcare professional will respond to your messages.',
                          style: TextStyle(fontSize: 12, color: kTextMuted)),
                    ],
                  ),
                );
              }
              return ListView.builder(
                padding: const EdgeInsets.symmetric(horizontal: kPad),
                itemCount: support.length,
                itemBuilder: (_, i) => _buildBubble(support[i]),
              );
            },
            loading: () => const Center(child: CircularProgressIndicator(color: kBeige)),
            error: (_, __) => const SizedBox(),
          ),
        ),
        _buildInputBar(isSupport: true),
      ],
    );
  }

  Widget _buildBubble(Map<String, dynamic> message) {
    final isUser = message['sender'] == 'user';
    final isAdmin = message['sender'] == 'admin';

    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Row(
        mainAxisAlignment: isUser ? MainAxisAlignment.end : MainAxisAlignment.start,
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          if (!isUser) ...[
            CircleAvatar(
              radius: 15,
              backgroundColor: kOlive,
              child: const Text('AI', style: TextStyle(fontSize: 9, color: kBeige)),
            ),
            const SizedBox(width: 8),
          ],
          Flexible(
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
              decoration: BoxDecoration(
                gradient: isUser
                    ? const LinearGradient(colors: [kBeige, kBeigeMuted])
                    : isAdmin
                        ? null
                        : null,
                color: isUser ? null : isAdmin ? kOlive : kBgCard,
                borderRadius: BorderRadius.only(
                  topLeft: const Radius.circular(16),
                  topRight: const Radius.circular(16),
                  bottomLeft: Radius.circular(isUser ? 16 : 4),
                  bottomRight: Radius.circular(isUser ? 4 : 16),
                ),
              ),
              child: Text(
                message['message'] as String? ?? '',
                style: TextStyle(
                  color: isUser ? kBgApp : kTextPrimary,
                  fontSize: 13,
                  height: 1.5,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTypingIndicator() {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Row(
        children: [
          CircleAvatar(
            radius: 15,
            backgroundColor: kOlive,
            child: const Text('AI', style: TextStyle(fontSize: 9, color: kBeige)),
          ),
          const SizedBox(width: 8),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            decoration: BoxDecoration(
              color: kBgCard,
              borderRadius: BorderRadius.circular(16),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: List.generate(3, (i) {
                return Container(
                  margin: const EdgeInsets.symmetric(horizontal: 2),
                  width: 7,
                  height: 7,
                  decoration: const BoxDecoration(
                    color: kBeige,
                    shape: BoxShape.circle,
                  ),
                )
                    .animate(delay: Duration(milliseconds: i * 150),
                        onPlay: (c) => c.repeat(reverse: true))
                    .scale(begin: const Offset(0.6, 0.6), end: const Offset(1.2, 1.2));
              }),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildInputBar({bool isSupport = false}) {
    return Container(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 16),
      decoration: BoxDecoration(
        color: kBgNav,
        border: Border(top: BorderSide(color: kBeige.withOpacity(0.08))),
      ),
      child: Row(
        children: [
          Icon(Icons.attach_file_rounded, color: kTextSecondary, size: 22),
          const SizedBox(width: 8),
          Icon(Icons.camera_alt_outlined, color: kTextSecondary, size: 22),
          const SizedBox(width: 10),
          Expanded(
            child: TextField(
              controller: _msgController,
              style: const TextStyle(color: kTextPrimary, fontSize: 14),
              decoration: InputDecoration(
                hintText: isSupport ? 'Message support...' : 'Ask Guardian AI...',
                contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(24),
                  borderSide: BorderSide.none,
                ),
                filled: true,
                fillColor: kBgCard,
              ),
              onSubmitted: (_) => _sendMessage(),
            ),
          ),
          const SizedBox(width: 10),
          GestureDetector(
            onTap: _sendMessage,
            child: Container(
              width: 42,
              height: 42,
              decoration: const BoxDecoration(
                gradient: kBeigeGradient,
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.send_rounded, color: kBgApp, size: 18),
            ),
          ),
        ],
      ),
    );
  }
}
