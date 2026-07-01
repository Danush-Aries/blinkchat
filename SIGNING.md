# Signing & Release Setup

This document walks the maintainer through the one-time setup required for
`.github/workflows/android-release.yml` to produce a signed APK on every
`v*` tag push.

## 1. Generate an upload keystore

Run this locally (macOS / Linux). You will be prompted for the store and key
passwords — **save them in a password manager**, they cannot be recovered.

```bash
keytool -genkeypair -v \
  -storetype PKCS12 \
  -keystore blinkchat-release.keystore \
  -alias blinkchat-upload \
  -keyalg RSA -keysize 2048 -validity 10000
```

Answer the CN / OU / O / L / ST / C prompts however you like — they are
embedded in the certificate but not shown to users.

## 2. Base64-encode the keystore

GitHub Actions secrets can only store text, so encode the binary keystore:

```bash
base64 -i blinkchat-release.keystore | pbcopy   # macOS
# or on Linux:
base64 -w 0 blinkchat-release.keystore | xclip -selection clipboard
```

The encoded blob is now on your clipboard.

## 3. Add the four repository secrets

Go to **Settings → Secrets and variables → Actions → New repository secret**
and add:

| Secret name              | Value                                                                 |
|--------------------------|-----------------------------------------------------------------------|
| `ANDROID_KEYSTORE_BASE64`| The base64 blob from step 2                                           |
| `KEYSTORE_PASSWORD`      | The store password you set in step 1                                  |
| `KEY_ALIAS`              | `blinkchat-upload` (or whatever `-alias` you used)                    |
| `KEY_PASSWORD`           | The key password from step 1 (often same as store password)           |

## 4. Wire the keystore into Gradle

The workflow writes these four properties into `android/gradle.properties`
at build time:

```
BLINKCHAT_UPLOAD_STORE_FILE=release.keystore
BLINKCHAT_UPLOAD_STORE_PASSWORD=...
BLINKCHAT_UPLOAD_KEY_ALIAS=...
BLINKCHAT_UPLOAD_KEY_PASSWORD=...
```

You must reference them from `android/app/build.gradle` inside the
`android { ... }` block:

```gradle
signingConfigs {
    release {
        if (project.hasProperty('BLINKCHAT_UPLOAD_STORE_FILE')) {
            storeFile file(BLINKCHAT_UPLOAD_STORE_FILE)
            storePassword BLINKCHAT_UPLOAD_STORE_PASSWORD
            keyAlias BLINKCHAT_UPLOAD_KEY_ALIAS
            keyPassword BLINKCHAT_UPLOAD_KEY_PASSWORD
        }
    }
}
buildTypes {
    release {
        signingConfig signingConfigs.release
        minifyEnabled true
        shrinkResources true
        proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
    }
}
```

## 5. Bootstrap the native android/ folder (one-time)

BlinkChat currently ships without a committed `android/` folder. Generate
one from the React Native template at the version pinned in `package.json`:

```bash
npx @react-native-community/cli init BlinkChatShell --version 0.81.5 --skip-install
cp -r BlinkChatShell/android ./android
rm -rf BlinkChatShell
```

Then merge the required BLE / mesh permissions from `README.md` into
`android/app/src/main/AndroidManifest.xml`, commit, and push.

## 6. Cut a release

```bash
git tag v0.1.0
git push origin v0.1.0
```

The workflow will build, sign, and attach `app-release.apk` to a new
GitHub Release named `v0.1.0`.

## 7. Losing the keystore

If you lose `blinkchat-release.keystore` you cannot ship updates to the
same install — users will have to uninstall and reinstall the new
build. Keep a copy in cold storage.
