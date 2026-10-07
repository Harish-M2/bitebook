# Bitebook App Store Readiness

**Status:** Not ready for store submission
**Audit date:** 2026-10-01
**Platforms:** Apple App Store (iOS) and Google Play (Android)

This is a repository-based release checklist, not a guarantee of store approval. Recheck the linked Apple, Google, and Expo requirements before submission because policies and target SDK requirements change.

## Current Setup

| Item | Verified state |
|---|---|
| Expo / React Native | Expo SDK `~57.0.26`, React Native `0.86.3` |
| App version | `1.0.0` in `app.json` |
| iOS bundle identifier | `com.bitebook.app` |
| Android application ID | `com.bitebook.app` |
| iOS icon | `./assets/expo.icon` asset catalog is configured; verify the exported app icon in a signed build |
| Android icons | Adaptive foreground, background, and monochrome image paths are configured |
| EAS production build profile | Present; `autoIncrement` enabled and app version sourced remotely |
| EAS project link | No `extra.eas.projectId` appears in the checked `app.json`; confirm or initialize the EAS project before building |
| EAS production submit profile | Present but empty; store credentials and platform-specific submission settings are not configured here |
| Privacy policy / support URLs | Not found in app config, README, or current screens; publish public URLs before submission |
| Account deletion | No in-app account deletion flow or external deletion request page found |
| UGC reporting / blocking | A `reports` database table exists, but no in-app report or block flow was found |
| Store listing assets | No store screenshots, descriptions, or listing metadata are maintained in the repository |

## Release Blockers

Do not submit until these are resolved and tested:

1. **Account deletion:** Add a discoverable in-app account deletion action and a public web page where users can request account and data deletion. The deletion process must cover the Supabase Auth account and associated profile, reviews, comments, likes, follows, saved items, and storage objects. Implement privileged Auth deletion through a narrowly scoped server-side function; never put the Supabase service-role key in the app. Apple requires in-app account deletion for apps with account creation. Google Play requires both an in-app path and an external web resource.
2. **UGC safeguards:** Bitebook contains public and followers-only reviews, comments, photos, and profiles. Provide terms/user rules before users post, in-app reporting for content and users, a user-blocking mechanism, published support contact details, and a documented moderation response process. The existing `reports` table is not sufficient without user-facing flows and moderation handling.
3. **Privacy policy and contact:** Publish an accurate, public, non-geofenced privacy-policy URL and link it in the app and both store listings. Add a working support/contact URL or email. Do not use a protected Vercel deployment URL for these legal/support links; production currently has Vercel Deployment Protection enabled.
4. **Store accounts and EAS credentials:** Confirm access to an Apple Developer account, App Store Connect, Google Play Console, and an Expo account. Link this repo to the intended EAS project. Configure iOS signing and App Store Connect submission credentials, plus the Google Play service-account credential in EAS. Keep credential files and keys out of Git.
5. **Native release verification:** Build and test signed iOS and Android binaries. The Vercel web export is not an iOS or Android release build. Verify current Google Play target API requirements in Play Console; as of this audit, Google's policy says new mobile apps and updates must target Android 16 / API 36 from August 31, 2026.

## Privacy And Store Declarations

Create a reviewed data inventory before filling either store's forms. Repository evidence indicates the app may handle:

- Account identity and authentication data: email, profile ID, username, display name, and bio.
- User-generated content: reviews, ratings, comments, profile photos, and food photos.
- Social graph and activity: follows, likes, saved restaurants/dishes, and notifications.
- Location: the app requests location access for nearby restaurant recommendations; verify exactly what is sent to Supabase or any provider and when.
- User searches and support/report submissions, if retained by the backend or Edge Functions.
- Data handled by third-party services and SDKs, including Supabase and any active restaurant/place providers.

Confirm actual collection, sharing, retention, deletion, and encryption behavior with the current app build and backend. Then make Apple App Privacy disclosures and Google Play Data safety declarations consistent with the privacy policy. Do not declare that tracking is absent or present until third-party SDK and data flows have been reviewed.

## Store Listing Checklist

- [ ] Final public app name, subtitle, descriptions, keywords, category, and developer display name.
- [ ] Age/content ratings completed accurately, including user-generated content and social interactions.
- [ ] iOS screenshots and Android phone screenshots captured from real, tested builds; add tablet screenshots only if tablet support is claimed.
- [ ] App icon and Android adaptive icon reviewed at actual store sizes and against both light/dark device surfaces.
- [ ] Public privacy policy and support URLs verified in a private browser session.
- [ ] Google Play Data safety, data deletion URL, ads declaration, target audience, content rating, and reviewer sign-in details completed.
- [ ] App Store Connect App Privacy, age rating, export compliance, content rights, review notes, and reviewer sign-in details completed.
- [ ] Reviewer demo account is active, has sample content, and can reach social/profile features. Supply credentials only in the store's reviewer-access form, never in this repository.
- [ ] Store descriptions and screenshots accurately represent features that are enabled on the production backend.

## Test And Release Sequence

1. Resolve all release blockers above and update the privacy policy and app disclosures.
2. From the repository root, run the local quality gates:

   ```sh
   npx tsc --noEmit
   npx expo lint
   npx expo-doctor
   npx expo export --platform web
   ```

3. Start the local Supabase stack and run `npx supabase test db` when Docker is available. Confirm the linked migration ledger is synchronized before any future `db push`; see `docs/COPILOT_HANDOVER.md` section 10 for the audited state.
4. Initialize/verify the EAS project and credentials, then build internal test binaries:

   ```sh
   eas login
   eas project:info
   eas build --platform ios --profile preview
   eas build --platform android --profile preview
   ```

5. Test on physical iPhones and Android devices, including fresh install, sign-up/sign-in, password reset, onboarding, location/photo permission denial, logging, profile editing, follow/unfollow, visible/private review access, comments, reporting/blocking, account deletion, offline/error states, and keyboard/safe-area layouts.
6. Promote through TestFlight and Google Play internal/closed testing. Complete store listings and reviewer access before production review.
7. Produce signed production builds and submit:

   ```sh
   eas build --platform ios --profile production
   eas build --platform android --profile production
   eas submit --platform ios --profile production
   eas submit --platform android --profile production
   ```

   EAS Submit uploads binaries; it does not complete store metadata, screenshots, privacy forms, or App Review submission. For iOS, finish the review submission in App Store Connect. For Android, review the uploaded bundle and promote the intended Play track.
8. Roll out gradually where the store supports staged release, monitor crashes/auth/database errors, and record rollback/disable procedures.

## Official References

- [Expo SDK 57 EAS Build](https://docs.expo.dev/versions/v57.0.0/build/introduction/)
- [Expo SDK 57 submit to app stores](https://docs.expo.dev/versions/v57.0.0/submit/introduction/)
- [Expo SDK 57 submit to Apple App Store](https://docs.expo.dev/versions/v57.0.0/submit/ios/)
- [Expo SDK 57 submit to Google Play](https://docs.expo.dev/versions/v57.0.0/submit/android/)
- [Apple App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- [Apple account deletion guidance](https://developer.apple.com/support/offering-account-deletion-in-your-app/)
- [Apple App Privacy details](https://developer.apple.com/app-store/app-privacy-details/)
- [Google Play User Generated Content policy](https://support.google.com/googleplay/android-developer/answer/9876937?hl=en)
- [Google Play account deletion requirements](https://support.google.com/googleplay/android-developer/answer/13327111?hl=en)
- [Google Play Data safety](https://support.google.com/googleplay/android-developer/answer/10787469?hl=en)
- [Google Play target API requirements](https://support.google.com/googleplay/android-developer/answer/11926878?hl=en)
