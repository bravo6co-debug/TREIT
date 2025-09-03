import { lazy } from 'react';

// Lazy load components for better performance
export const HomeScreen = lazy(() => import('../components/HomeScreen'));
export const ProjectsScreen = lazy(() => import('../components/ProjectsScreen'));
export const AccountInfoScreen = lazy(() => import('../components/AccountInfoScreen'));
export const CommunityScreen = lazy(() => import('../components/CommunityScreen'));
export const GiftShopScreen = lazy(() => import('../components/GiftShopScreen'));
export const PremiumProjectsScreen = lazy(() => import('../components/PremiumProjectsScreen'));
export const SettingsScreen = lazy(() => import('../components/SettingsScreen'));
export const LevelUpScreen = lazy(() => import('../components/LevelUpScreen'));
export const ReferralDashboard = lazy(() => import('../components/ReferralDashboard'));

// Chart components are heavy, so lazy load them
export const AchievementTracker = lazy(() => import('../components/AchievementTracker'));
export const AttendanceCalendar = lazy(() => import('../components/AttendanceCalendar'));
export const LevelProgress = lazy(() => import('../components/LevelProgress'));

// Interactive components
export const XPBoosterGames = lazy(() => import('../components/XPBoosterGames'));
export const DailyBonus = lazy(() => import('../components/DailyBonus'));
export const ReferralSystem = lazy(() => import('../components/ReferralSystem'));
export const SocialAccountManager = lazy(() => import('../components/SocialAccountManager'));
export const BonusAnimations = lazy(() => import('../components/BonusAnimations'));