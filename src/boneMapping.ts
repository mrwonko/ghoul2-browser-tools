const JK2_BONES = {
  "model_root":     0,  "pelvis":         1,  "Motion":         2,
  "lfemurYZ":       3,  "lfemurX":        4,  "ltibia":         5,
  "ltalus":         6,  "ltarsal":        7,  "rfemurYZ":       8,
  "rfemurX":        9,  "rtibia":        10,  "rtalus":        11,
  "rtarsal":       12,  "lower_lumbar":  13,  "upper_lumbar":  14,
  "thoracic":      15,  "cervical":      16,  "cranium":       17,
  "ceyebrow":      18,  "jaw":           19,  "lblip2":        20,
  "leye":          21,  "rblip2":        22,  "ltlip2":        23,
  "rtlip2":        24,  "reye":          25,  "rclavical":     26,
  "rhumerus":      27,  "rhumerusX":     28,  "rradius":       29,
  "rradiusX":      30,  "rhand":         31,  "mc7":           32,
  "r_d5_j1":       33,  "r_d5_j2":       34,  "r_d5_j3":       35,
  "r_d1_j1":       36,  "r_d1_j2":       37,  "r_d1_j3":       38,
  "r_d2_j1":       39,  "r_d2_j2":       40,  "r_d2_j3":       41,
  "r_d3_j1":       42,  "r_d3_j2":       43,  "r_d3_j3":       44,
  "r_d4_j1":       45,  "r_d4_j2":       46,  "r_d4_j3":       47,
  "rhang_tag_bone": 48, "lclavical":     49,  "lhumerus":      50,
  "lhumerusX":     51,  "lradius":       52,  "lradiusX":      53,
  "lhand":         54,  "mc5":           55,  "l_d5_j1":       56,
  "l_d5_j2":       57,  "l_d5_j3":       58,  "l_d4_j1":       59,
  "l_d4_j2":       60,  "l_d4_j3":       61,  "l_d3_j1":       62,
  "l_d3_j2":       63,  "l_d3_j3":       64,  "l_d2_j1":       65,
  "l_d2_j2":       66,  "l_d2_j3":       67,  "l_d1_j1":       68,
  "l_d1_j2":       69,  "l_d1_j3":       70,  "face":          71,
} as const;

const JK3_BONES = {
  "model_root":     0,  "pelvis":         1,  "Motion":         2,
  "lfemurYZ":       3,  "lfemurX":        4,  "ltibia":         5,
  "ltalus":         6,  "rfemurYZ":       7,  "rfemurX":        8,
  "rtibia":         9,  "rtalus":        10,  "lower_lumbar":  11,
  "upper_lumbar":  12,  "thoracic":      13,  "cervical":      14,
  "cranium":       15,  "ceyebrow":      16,  "jaw":           17,
  "lblip2":        18,  "leye":          19,  "rblip2":        20,
  "ltlip2":        21,  "rtlip2":        22,  "reye":          23,
  "rclavical":     24,  "rhumerus":      25,  "rhumerusX":     26,
  "rradius":       27,  "rradiusX":      28,  "rhand":         29,
  "r_d1_j1":       30,  "r_d1_j2":       31,  "r_d2_j1":       32,
  "r_d2_j2":       33,  "r_d4_j1":       34,  "r_d4_j2":       35,
  "rhang_tag_bone": 36, "lclavical":     37,  "lhumerus":      38,
  "lhumerusX":     39,  "lradius":       40,  "lradiusX":      41,
  "lhand":         42,  "l_d4_j1":       43,  "l_d4_j2":       44,
  "l_d2_j1":       45,  "l_d2_j2":       46,  "l_d1_j1":       47,
  "l_d1_j2":       48,  "ltail":         49,  "rtail":         50,
  "lhang_tag_bone": 51, "face":          52,
} as const;

type Jk2BoneName = keyof typeof JK2_BONES;
type Jk3BoneName = keyof typeof JK3_BONES;

// Maps each JK3 bone name to its JK2 equivalent.
// `satisfies` checks every key individually — any JK3 bone name that isn't
// a valid Jk2BoneName will produce a type error on that specific line.
const JK3_TO_JK2_NAME = {
  "model_root":     "model_root",
  "pelvis":         "pelvis",
  "Motion":         "Motion",
  "lfemurYZ":       "lfemurYZ",
  "lfemurX":        "lfemurX",
  "ltibia":         "ltibia",
  "ltalus":         "ltalus",
  "rfemurYZ":       "rfemurYZ",
  "rfemurX":        "rfemurX",
  "rtibia":         "rtibia",
  "rtalus":         "rtalus",
  "lower_lumbar":   "lower_lumbar",
  "upper_lumbar":   "upper_lumbar",
  "thoracic":       "thoracic",
  "cervical":       "cervical",
  "cranium":        "cranium",
  "ceyebrow":       "ceyebrow",
  "jaw":            "jaw",
  "lblip2":         "lblip2",
  "leye":           "leye",
  "rblip2":         "rblip2",
  "ltlip2":         "ltlip2",
  "rtlip2":         "rtlip2",
  "reye":           "reye",
  "rclavical":      "rclavical",
  "rhumerus":       "rhumerus",
  "rhumerusX":      "rhumerusX",
  "rradius":        "rradius",
  "rradiusX":       "rradiusX",
  "rhand":          "rhand",
  "r_d1_j1":        "r_d1_j1",
  "r_d1_j2":        "r_d1_j2",
  "r_d2_j1":        "r_d2_j1",
  "r_d2_j2":        "r_d2_j2",
  "r_d4_j1":        "r_d4_j1",
  "r_d4_j2":        "r_d4_j2",
  "rhang_tag_bone": "rhang_tag_bone",
  "lclavical":      "lclavical",
  "lhumerus":       "lhumerus",
  "lhumerusX":      "lhumerusX",
  "lradius":        "lradius",
  "lradiusX":       "lradiusX",
  "lhand":          "lhand",
  "l_d4_j1":        "l_d4_j1",
  "l_d4_j2":        "l_d4_j2",
  "l_d2_j1":        "l_d2_j1",
  "l_d2_j2":        "l_d2_j2",
  "l_d1_j1":        "l_d1_j1",
  "l_d1_j2":        "l_d1_j2",
  "ltail":          "ltail",          // no JK2 equivalent — fix me
  "rtail":          "rtail",          // no JK2 equivalent — fix me
  "lhang_tag_bone": "lhang_tag_bone", // no JK2 equivalent — fix me
  "face":           "face",
} satisfies Record<Jk3BoneName, Jk2BoneName>;

// jk3 bone index → jk2 bone index
export const JK3_TO_JK2: ReadonlyArray<number> =
  (Object.keys(JK3_BONES) as Jk3BoneName[])
    .map(name => JK2_BONES[JK3_TO_JK2_NAME[name]]);
