import type { ImageSource } from 'expo-image';

type BundledImage = ImageSource | number;
export type BrandIconVariant = 'gold' | 'green' | 'ivory';
export type BrandIconName = 'home' | 'discover' | 'add' | 'calendar' | 'profile' |
  'favourite' | 'bookmark' | 'rating' | 'comment' | 'location' | 'camera' |
  'filter' | 'share' | 'more' | 'food';

export const brandAssets: Record<'appIcon' | 'appIconLight' | 'logoHorizontal' |
  'logoStacked' | 'logoStackedDark' | 'logoSymbol' | 'logoSymbolDark' | 'logoLight' | 'logoDark' |
  'wordmarkLight' | 'wordmarkDark', BundledImage> = {
  appIcon: require('../../assets/bitebook_brand_assets/generated/app-icon.png'),
  appIconLight: require('../../assets/bitebook_brand_assets/generated/app-icon-light.png'),
  logoHorizontal: require('../../assets/bitebook_brand_assets/generated/wordmark-light-horizontal.png'),
  logoStacked: require('../../assets/bitebook_brand_assets/generated/wordmark-light-stacked.png'),
  logoStackedDark: require('../../assets/bitebook_brand_assets/generated/wordmark-dark-stacked.png'),
  logoSymbol: require('../../assets/bitebook_brand_assets/logos/symbol-ivory-gold.svg'),
  logoSymbolDark: require('../../assets/bitebook_brand_assets/logos/symbol-green-gold.svg'),
  logoLight: require('../../assets/bitebook_brand_assets/generated/wordmark-light-horizontal.png'),
  logoDark: require('../../assets/bitebook_brand_assets/generated/wordmark-dark-horizontal.png'),
  wordmarkLight: require('../../assets/bitebook_brand_assets/logos/wordmark-only-light.svg'),
  wordmarkDark: require('../../assets/bitebook_brand_assets/logos/wordmark-only-dark.svg'),
};

export const brandIcons: Record<BrandIconName, Record<BrandIconVariant, BundledImage>> = {
  home: {
    gold: require('../../assets/bitebook_brand_assets/icons/home-gold.svg'),
    green: require('../../assets/bitebook_brand_assets/icons/home-green.svg'),
    ivory: require('../../assets/bitebook_brand_assets/icons/home-ivory.svg'),
  },
  discover: {
    gold: require('../../assets/bitebook_brand_assets/icons/discover-gold.svg'),
    green: require('../../assets/bitebook_brand_assets/icons/discover-green.svg'),
    ivory: require('../../assets/bitebook_brand_assets/icons/discover-ivory.svg'),
  },
  add: {
    gold: require('../../assets/bitebook_brand_assets/icons/add-gold.svg'),
    green: require('../../assets/bitebook_brand_assets/icons/add-green.svg'),
    ivory: require('../../assets/bitebook_brand_assets/icons/add-ivory.svg'),
  },
  calendar: {
    gold: require('../../assets/bitebook_brand_assets/icons/calendar-gold.svg'),
    green: require('../../assets/bitebook_brand_assets/icons/calendar-green.svg'),
    ivory: require('../../assets/bitebook_brand_assets/icons/calendar-ivory.svg'),
  },
  profile: {
    gold: require('../../assets/bitebook_brand_assets/icons/profile-gold.svg'),
    green: require('../../assets/bitebook_brand_assets/icons/profile-green.svg'),
    ivory: require('../../assets/bitebook_brand_assets/icons/profile-ivory.svg'),
  },
  favourite: {
    gold: require('../../assets/bitebook_brand_assets/icons/heart-gold.svg'),
    green: require('../../assets/bitebook_brand_assets/icons/heart-green.svg'),
    ivory: require('../../assets/bitebook_brand_assets/icons/heart-ivory.svg'),
  },
  bookmark: {
    gold: require('../../assets/bitebook_brand_assets/icons/saved-gold.svg'),
    green: require('../../assets/bitebook_brand_assets/icons/saved-green.svg'),
    ivory: require('../../assets/bitebook_brand_assets/icons/saved-ivory.svg'),
  },
  rating: {
    gold: require('../../assets/bitebook_brand_assets/icons/star-gold.svg'),
    green: require('../../assets/bitebook_brand_assets/icons/star-green.svg'),
    ivory: require('../../assets/bitebook_brand_assets/icons/star-ivory.svg'),
  },
  comment: {
    gold: require('../../assets/bitebook_brand_assets/icons/comment-gold.svg'),
    green: require('../../assets/bitebook_brand_assets/icons/comment-green.svg'),
    ivory: require('../../assets/bitebook_brand_assets/icons/comment-ivory.svg'),
  },
  location: {
    gold: require('../../assets/bitebook_brand_assets/icons/location-gold.svg'),
    green: require('../../assets/bitebook_brand_assets/icons/location-green.svg'),
    ivory: require('../../assets/bitebook_brand_assets/icons/location-ivory.svg'),
  },
  camera: {
    gold: require('../../assets/bitebook_brand_assets/icons/camera-gold.svg'),
    green: require('../../assets/bitebook_brand_assets/icons/camera-green.svg'),
    ivory: require('../../assets/bitebook_brand_assets/icons/camera-ivory.svg'),
  },
  filter: {
    gold: require('../../assets/bitebook_brand_assets/icons/filter-gold.svg'),
    green: require('../../assets/bitebook_brand_assets/icons/filter-green.svg'),
    ivory: require('../../assets/bitebook_brand_assets/icons/filter-ivory.svg'),
  },
  share: {
    gold: require('../../assets/bitebook_brand_assets/icons/share-gold.svg'),
    green: require('../../assets/bitebook_brand_assets/icons/share-green.svg'),
    ivory: require('../../assets/bitebook_brand_assets/icons/share-ivory.svg'),
  },
  more: {
    gold: require('../../assets/bitebook_brand_assets/icons/more-gold.svg'),
    green: require('../../assets/bitebook_brand_assets/icons/more-green.svg'),
    ivory: require('../../assets/bitebook_brand_assets/icons/more-ivory.svg'),
  },
  food: {
    gold: require('../../assets/bitebook_brand_assets/icons/fork-knife-gold.svg'),
    green: require('../../assets/bitebook_brand_assets/icons/fork-knife-green.svg'),
    ivory: require('../../assets/bitebook_brand_assets/icons/fork-knife-ivory.svg'),
  },
};

export const authBackgrounds = {
  welcome: {
    dark: require('../../assets/images/auth-welcome-dark.jpg'),
    light: require('../../assets/images/auth-welcome-light.jpg'),
  },
  forms: {
    dark: require('../../assets/images/auth-forms-dark.jpg'),
    light: require('../../assets/images/auth-forms-light.jpg'),
  },
  confirmation: {
    dark: require('../../assets/images/auth-confirmation-dark.jpg'),
    light: require('../../assets/images/auth-confirmation-light.jpg'),
  },
} as const;