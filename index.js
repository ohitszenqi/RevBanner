// PersonalBanner - Revenge Plugin (pre-built, no build step needed)
// Adds a client-side GIF/image banner to YOUR profile only.

"use strict";

const { plugin: { storage }, metro: { findByProps, findByName }, patcher: { after }, metro: { common: { React, ReactNative } }, storage: { useProxy }, settings: { registerSettings } } =vendetta;

// ── Defaults ──────────────────────────────────────────────────────────────────
if (storage.bannerUrl === undefined) storage.bannerUrl = "";
if (storage.bannerHeight === undefined) storage.bannerHeight = 120;
if (storage.roundedCorners === undefined) storage.roundedCorners = true;

// ── Helpers ───────────────────────────────────────────────────────────────────
const { View, Text, Image, TextInput, Switch, TouchableOpacity, ScrollView, StyleSheet } = ReactNative;
const UserStore = findByProps("getCurrentUser");

// ── Settings UI ───────────────────────────────────────────────────────────────
function SettingsPage() {
  const cfg = useProxy(storage);
  const [draft, setDraft] = React.useState(cfg.bannerUrl || "");

  const HEIGHTS = [80, 120, 160, 200];

  function save() { cfg.bannerUrl = draft.trim(); }

  return React.createElement(ScrollView, { style: { flex: 1, padding: 16 } },

    // ── URL section ──
    React.createElement(Text, { style: styles.sectionTitle }, "BANNER URL"),
    React.createElement(Text, { style: styles.hint }, "Paste a direct link to a GIF, PNG, JPG or WEBP:"),
    React.createElement(TextInput, {
      style: styles.input,
      value: draft,
      onChangeText: setDraft,
      onBlur: save,
      onSubmitEditing: save,
      placeholder: "https://example.com/banner.gif",
      placeholderTextColor: "#555",
      autoCapitalize: "none",
      autoCorrect: false,
      keyboardType: "url",
      returnKeyType: "done",
    }),

    // ── Preview ──
    React.createElement(Text, { style: styles.sectionTitle }, "PREVIEW"),
    React.createElement(View, {
      style: [styles.previewBox, { height: cfg.bannerHeight, borderRadius: cfg.roundedCorners ? 10 : 0 }]
    },
      cfg.bannerUrl
        ? React.createElement(Image, {
            source: { uri: cfg.bannerUrl },
            style: { width: "100%", height: "100%", resizeMode: "cover" },
          })
        : React.createElement(View, { style: styles.previewEmpty },
            React.createElement(Text, { style: { color: "#666" } }, "No banner set yet")
          )
    ),

    // ── Height presets ──
    React.createElement(Text, { style: [styles.sectionTitle, { marginTop: 16 }] }, "BANNER HEIGHT"),
    React.createElement(View, { style: { flexDirection: "row", marginBottom: 16 } },
      ...HEIGHTS.map(h =>
        React.createElement(TouchableOpacity, {
          key: h,
          onPress: () => { cfg.bannerHeight = h; },
          style: [styles.heightBtn, { backgroundColor: cfg.bannerHeight === h ? "#5865f2" : "#2b2d31" }],
        },
          React.createElement(Text, { style: { color: cfg.bannerHeight === h ? "#fff" : "#aaa", fontWeight: "600" } }, h + "px")
        )
      )
    ),

    // ── Rounded corners toggle ──
    React.createElement(Text, { style: styles.sectionTitle }, "OPTIONS"),
    React.createElement(View, { style: styles.row },
      React.createElement(Text, { style: styles.rowLabel }, "Rounded Corners"),
      React.createElement(Switch, {
        value: cfg.roundedCorners,
        onValueChange: v => { cfg.roundedCorners = v; },
      })
    ),

    React.createElement(View, { style: { height: 40 } })
  );
}

const styles = StyleSheet.create({
  sectionTitle: { fontSize: 11, fontWeight: "700", letterSpacing: 0.8, color: "#8e9297", marginBottom: 6, marginTop: 4 },
  hint: { fontSize: 13, color: "#b5bac1", marginBottom: 8 },
  input: { backgroundColor: "#1e1f22", color: "#fff", borderRadius: 8, padding: 10, fontSize: 14, marginBottom: 12, borderWidth: 1, borderColor: "#3f4147" },
  previewBox: { width: "100%", overflow: "hidden", backgroundColor: "#1e1f22", marginBottom: 8 },
  previewEmpty: { flex: 1, alignItems: "center", justifyContent: "center" },
  heightBtn: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 6, marginRight: 8 },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 12 },
  rowLabel: { fontSize: 15, color: "#fff" },
});

// ── Banner view injected into profile ─────────────────────────────────────────
function BannerView() {
  const cfg = useProxy(storage);
  if (!cfg.bannerUrl) return null;

  return React.createElement(View, {
    style: {
      width: "100%",
      height: cfg.bannerHeight,
      overflow: "hidden",
      borderRadius: cfg.roundedCorners ? 10 : 0,
    }
  },
    React.createElement(Image, {
      source: { uri: cfg.bannerUrl },
      style: { width: "100%", height: "100%", resizeMode: "cover" },
    })
  );
}

// ── Patch ─────────────────────────────────────────────────────────────────────
const patches = [];

export default {
  onLoad() {
    registerSettings("PersonalBanner", SettingsPage);

    // Try to find the profile header component
    const ProfileHeader =
      findByName("UserProfileHeader", false) ??
      findByProps("UserProfileHeader")?.UserProfileHeader ??
      findByProps("bannerHeight", "BANNER_HEIGHT");

    if (!ProfileHeader) {
      console.warn("[PersonalBanner] Could not find profile header component.");
      return;
    }

    const target = typeof ProfileHeader === "function" ? { default: ProfileHeader } : ProfileHeader;
    const key = typeof ProfileHeader === "function" ? "default" : Object.keys(target).find(k => typeof target[k] === "function");

    if (!key) return;

    patches.push(
      after(key, target, ([props], ret) => {
        if (!ret || !UserStore) return ret;

        const me = UserStore.getCurrentUser?.();
        if (!me) return ret;

        const uid = props?.user?.id ?? props?.userId ?? props?.profile?.userId;
        if (uid !== me.id) return ret;
        if (!storage.bannerUrl) return ret;

        // Inject banner at top of the profile element
        const orig = ret.props.children;
        ret.props.children = [
          React.createElement(BannerView, { key: "pb-banner" }),
          ...(Array.isArray(orig) ? orig : [orig]),
        ];
        return ret;
      })
    );
  },

  onUnload() {
    patches.forEach(p => p());
    patches.length = 0;
  },
};
