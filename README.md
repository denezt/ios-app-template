# Karotu Health App

Ionic + Angular + Capacitor starter app that reads `steps`, `distance`, and `heartRate` from Apple Health via `@capgo/capacitor-health`.

## Install

```bash
npm install
npm run build
npx cap add ios
npx cap sync ios
npx cap open ios
```

## iOS setup

In Xcode:

- Enable **HealthKit** under **Signing & Capabilities**
- Add the following to `ios/App/App/Info.plist`

```xml
<key>NSHealthShareUsageDescription</key>
<string>This app reads your health data to display steps, distance, and heart rate.</string>
<key>NSHealthUpdateUsageDescription</key>
<string>This app writes health data only when you explicitly ask it to.</string>
```

## Notes

- Must run on a real iPhone.
- Heart-rate data usually comes from Apple Watch or another source synced into Apple Health.
- The app requests read access for `steps`, `distance`, and `heartRate`.
