import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
} from 'react-native';

interface TrendingDiscussion {
  id: string;
  title: string;
  description: string;
  icon: string;
  members: string;
  posts: string;
  category: string;
}

interface Post {
  id: string;
  title: string;
  author: string;
  time: string;
  upvotes: number;
  comments: number;
  category: string;
}

interface RedditTrendingProps {
  onHome: () => void;
  onExplore: () => void;
  onCreate: () => void;
  onMyEvents: () => void;
  onProfile: () => void;
}

const RedditTrending: React.FC<RedditTrendingProps> = ({
  onHome,
  onExplore,
  onCreate,
  onMyEvents,
  onProfile,
}) => {
  const [activeTab, setActiveTab] = useState('explore');
  const [selectedCategory, setSelectedCategory] = useState('all');

  const trendingDiscussions: TrendingDiscussion[] = [
    {
      id: '1',
      title: 'r/CollegeEvents',
      description: 'Real-time event recommendations',
      icon: '📱',
      members: '15.2k',
      posts: '234',
      category: 'events',
    },
    {
      id: '2',
      title: 'r/CampusLife',
      description: 'Daily campus activities and discussions',
      icon: '🏫',
      members: '8.7k',
      posts: '156',
      category: 'campus',
    },
    {
      id: '3',
      title: 'r/StudentEvents',
      description: 'Student-organized events and meetups',
      icon: '🎉',
      members: '12.4k',
      posts: '89',
      category: 'student',
    },
  ];

  const recentPosts: Post[] = [
    {
      id: '1',
      title: 'Anyone going to the Tech Talk tomorrow?',
      author: 'u/techstudent24',
      time: '2h ago',
      upvotes: 45,
      comments: 12,
      category: 'tech',
    },
    {
      id: '2',
      title: 'Free pizza at the Student Union right now!',
      author: 'u/pizzalover',
      time: '4h ago',
      upvotes: 128,
      comments: 23,
      category: 'food',
    },
    {
      id: '3',
      title: 'Study group for finals - Library Room 204',
      author: 'u/studybuddy',
      time: '6h ago',
      upvotes: 67,
      comments: 8,
      category: 'study',
    },
  ];

  const categories = [
    { id: 'all', name: 'All', icon: '🌟' },
    { id: 'events', name: 'Events', icon: '🎉' },
    { id: 'tech', name: 'Tech', icon: '💻' },
    { id: 'food', name: 'Food', icon: '🍕' },
    { id: 'study', name: 'Study', icon: '📚' },
  ];

  const handleTabPress = (tab: string) => {
    setActiveTab(tab);
    switch (tab) {
      case 'home':
        onHome();
        break;
      case 'explore':
        onExplore();
        break;
      case 'create':
        onCreate();
        break;
      case 'myEvents':
        onMyEvents();
        break;
      case 'profile':
        onProfile();
        break;
    }
  };

  const handleExploreDiscussions = () => {
    console.log('Explore more discussions');
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'tech': return '#3498db';
      case 'food': return '#f39c12';
      case 'study': return '#9b59b6';
      case 'events': return '#e74c3c';
      default: return '#95a5a6';
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.title}>Event Discussions</Text>
          <Text style={styles.subtitle}>Connect with your campus community</Text>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Featured Community */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Featured Community</Text>
          <View style={styles.featuredCard}>
            <View style={styles.featuredHeader}>
              <View style={styles.featuredIcon}>
                <Text style={styles.featuredEmoji}>📱</Text>
              </View>
              <View style={styles.featuredInfo}>
                <Text style={styles.featuredTitle}>r/CollegeEvents</Text>
                <View style={styles.featuredStats}>
                  <Text style={styles.featuredStat}>👥 15.2k members</Text>
                  <Text style={styles.featuredStat}>📝 234 posts today</Text>
                </View>
              </View>
              <TouchableOpacity style={styles.joinButton}>
                <Text style={styles.joinButtonText}>Join</Text>
              </TouchableOpacity>
            </View>
            
            <Text style={styles.featuredDescription}>
              r/CollegeEvents is a community on Reddit where students share and discuss events 
              happening on college campuses. It's a great place to find out about upcoming events and 
              get recommendations from other students.
            </Text>
            
            <TouchableOpacity style={styles.exploreButton} onPress={handleExploreDiscussions}>
              <Text style={styles.exploreButtonText}>Explore Community →</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Category Filter */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Browse by Category</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoriesScroll}>
            {categories.map((category) => (
              <TouchableOpacity
                key={category.id}
                style={[
                  styles.categoryButton,
                  selectedCategory === category.id && styles.activeCategoryButton
                ]}
                onPress={() => setSelectedCategory(category.id)}
              >
                <Text style={styles.categoryIcon}>{category.icon}</Text>
                <Text style={[
                  styles.categoryText,
                  selectedCategory === category.id && styles.activeCategoryText
                ]}>
                  {category.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Trending Posts */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Trending Posts</Text>
          {recentPosts.map((post) => (
            <TouchableOpacity key={post.id} style={styles.postCard}>
              <View style={styles.postHeader}>
                <View style={[styles.categoryTag, { backgroundColor: getCategoryColor(post.category) }]}>
                  <Text style={styles.categoryTagText}>{post.category}</Text>
                </View>
                <Text style={styles.postTime}>{post.time}</Text>
              </View>
              
              <Text style={styles.postTitle}>{post.title}</Text>
              <Text style={styles.postAuthor}>by {post.author}</Text>
              
              <View style={styles.postFooter}>
                <View style={styles.postStat}>
                  <Text style={styles.postStatIcon}>⬆️</Text>
                  <Text style={styles.postStatText}>{post.upvotes}</Text>
                </View>
                <View style={styles.postStat}>
                  <Text style={styles.postStatIcon}>💬</Text>
                  <Text style={styles.postStatText}>{post.comments}</Text>
                </View>
                <TouchableOpacity style={styles.shareButton}>
                  <Text style={styles.shareButtonText}>Share</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Other Communities */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Other Communities</Text>
          {trendingDiscussions.slice(1).map((discussion) => (
            <TouchableOpacity key={discussion.id} style={styles.communityCard}>
              <View style={styles.communityIcon}>
                <Text style={styles.communityEmoji}>{discussion.icon}</Text>
              </View>
              <View style={styles.communityInfo}>
                <Text style={styles.communityTitle}>{discussion.title}</Text>
                <Text style={styles.communityDescription}>{discussion.description}</Text>
                <View style={styles.communityStats}>
                  <Text style={styles.communityStat}>👥 {discussion.members}</Text>
                  <Text style={styles.communityStat}>📝 {discussion.posts} posts</Text>
                </View>
              </View>
              <TouchableOpacity style={styles.smallJoinButton}>
                <Text style={styles.smallJoinButtonText}>Join</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          ))}
        </View>

        {/* Community Guidelines */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Community Guidelines</Text>
          <View style={styles.guidelinesCard}>
            <View style={styles.guidelineItem}>
              <Text style={styles.guidelineIcon}>✅</Text>
              <Text style={styles.guidelineText}>Be respectful and inclusive in all discussions</Text>
            </View>
            <View style={styles.guidelineItem}>
              <Text style={styles.guidelineIcon}>📝</Text>
              <Text style={styles.guidelineText}>Share accurate event information</Text>
            </View>
            <View style={styles.guidelineItem}>
              <Text style={styles.guidelineIcon}>🤝</Text>
              <Text style={styles.guidelineText}>Help fellow students discover great events</Text>
            </View>
            <View style={styles.guidelineItem}>
              <Text style={styles.guidelineIcon}>🚫</Text>
              <Text style={styles.guidelineText}>No spam or promotional content</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Bottom Navigation */}
      <View style={styles.bottomNavigation}>
        <TouchableOpacity
          style={[styles.navButton, activeTab === 'home' && styles.activeNavButton]}
          onPress={() => handleTabPress('home')}
        >
          <Text style={styles.navIcon}>🏠</Text>
          <Text style={[styles.navLabel, activeTab === 'home' && styles.activeNavLabel]}>Home</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.navButton, activeTab === 'explore' && styles.activeNavButton]}
          onPress={() => handleTabPress('explore')}
        >
          <Text style={styles.navIcon}>🔍</Text>
          <Text style={[styles.navLabel, activeTab === 'explore' && styles.activeNavLabel]}>Explore</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.navButton, activeTab === 'create' && styles.activeNavButton]}
          onPress={() => handleTabPress('create')}
        >
          <Text style={styles.navIcon}>➕</Text>
          <Text style={[styles.navLabel, activeTab === 'create' && styles.activeNavLabel]}>Create</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.navButton, activeTab === 'myEvents' && styles.activeNavButton]}
          onPress={() => handleTabPress('myEvents')}
        >
          <Text style={styles.navIcon}>📅</Text>
          <Text style={[styles.navLabel, activeTab === 'myEvents' && styles.activeNavLabel]}>My Events</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.navButton, activeTab === 'profile' && styles.activeNavButton]}
          onPress={() => handleTabPress('profile')}
        >
          <Text style={styles.navIcon}>👤</Text>
          <Text style={[styles.navLabel, activeTab === 'profile' && styles.activeNavLabel]}>Profile</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f1419',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 24,
  },
  headerContent: {
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#8e9aaf',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 16,
  },
  featuredCard: {
    backgroundColor: '#1e2328',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#2a2f36',
  },
  featuredHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  featuredIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#ff6b35',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  featuredEmoji: {
    fontSize: 28,
  },
  featuredInfo: {
    flex: 1,
  },
  featuredTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 8,
  },
  featuredStats: {
    flexDirection: 'row',
    gap: 16,
  },
  featuredStat: {
    fontSize: 12,
    color: '#8e9aaf',
  },
  joinButton: {
    backgroundColor: '#3498db',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
  },
  joinButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  featuredDescription: {
    fontSize: 14,
    color: '#ecf0f1',
    lineHeight: 20,
    marginBottom: 20,
  },
  exploreButton: {
    alignSelf: 'flex-start',
  },
  exploreButtonText: {
    color: '#3498db',
    fontSize: 14,
    fontWeight: '600',
  },
  categoriesScroll: {
    paddingRight: 20,
  },
  categoryButton: {
    backgroundColor: '#1e2328',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    marginRight: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2a2f36',
  },
  activeCategoryButton: {
    backgroundColor: '#3498db',
    borderColor: '#3498db',
  },
  categoryIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  categoryText: {
    color: '#8e9aaf',
    fontSize: 14,
    fontWeight: '500',
  },
  activeCategoryText: {
    color: '#ffffff',
  },
  postCard: {
    backgroundColor: '#1e2328',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#2a2f36',
  },
  postHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  categoryTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  categoryTagText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  postTime: {
    fontSize: 12,
    color: '#8e9aaf',
  },
  postTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 8,
    lineHeight: 22,
  },
  postAuthor: {
    fontSize: 14,
    color: '#8e9aaf',
    marginBottom: 16,
  },
  postFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  postStat: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  postStatIcon: {
    fontSize: 16,
    marginRight: 4,
  },
  postStatText: {
    fontSize: 14,
    color: '#8e9aaf',
    marginRight: 16,
  },
  shareButton: {
    backgroundColor: '#2a3441',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  shareButtonText: {
    color: '#3498db',
    fontSize: 12,
    fontWeight: '600',
  },
  communityCard: {
    backgroundColor: '#1e2328',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2a2f36',
  },
  communityIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#2a3441',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  communityEmoji: {
    fontSize: 20,
  },
  communityInfo: {
    flex: 1,
  },
  communityTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 4,
  },
  communityDescription: {
    fontSize: 14,
    color: '#8e9aaf',
    marginBottom: 8,
  },
  communityStats: {
    flexDirection: 'row',
    gap: 12,
  },
  communityStat: {
    fontSize: 12,
    color: '#8e9aaf',
  },
  smallJoinButton: {
    backgroundColor: '#3498db',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  smallJoinButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  guidelinesCard: {
    backgroundColor: '#1e2328',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#2a2f36',
  },
  guidelineItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  guidelineIcon: {
    fontSize: 16,
    marginRight: 12,
    marginTop: 2,
  },
  guidelineText: {
    fontSize: 14,
    color: '#ecf0f1',
    lineHeight: 20,
    flex: 1,
  },
  bottomNavigation: {
    flexDirection: 'row',
    backgroundColor: '#1e2328',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#2a2f36',
  },
  navButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
  },
  activeNavButton: {
    backgroundColor: '#2a3441',
  },
  navIcon: {
    fontSize: 20,
    marginBottom: 4,
  },
  navLabel: {
    fontSize: 12,
    color: '#8e9aaf',
  },
  activeNavLabel: {
    color: '#3498db',
  },
});

export default RedditTrending;