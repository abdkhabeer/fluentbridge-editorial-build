import { describe, expect, it } from "vitest";
import { STUDENT_PACKAGE_ERROR, emptyDraft, parseApplication, parseContactCorrection, validateStep, packageFitsFormat, type EnrollmentDraft } from "./schema";
import { checkPhone, normalizePhone } from "./phone";
import { frequencyPackageNote, reviewFlagsFor } from "./flags";
import { paymentMethodsFor, suggestedTrackForGoal } from "./options";

const draft = (over: Partial<EnrollmentDraft> = {}): EnrollmentDraft => ({
  ...emptyDraft(),
  full_name: "Karim Hassan",
  country: "Egypt",
  city: "Cairo",
  email: "karim@example.com",
  whatsapp_number: "01112345678",
  primary_learning_goal: "general",
  self_reported_level: "not_sure",
  lesson_format: "small_group",
  group_status: "has_group",
  preferred_classes_per_week: "flexible",
  selected_package: "group-8",
  preferred_payment_method: "paypal",
  consent: true,
  ...over,
});

describe("required fields", () => {
  it("reports each missing personal field", () => {
    const errors = validateStep(0, emptyDraft());
    expect(Object.keys(errors).sort()).toEqual(["city", "country", "email", "full_name", "whatsapp_number"].sort());
  });

  it("requires a country name when 'Other' is chosen", () => {
    expect(validateStep(0, draft({ country: "Other", whatsapp_number: "+33612345678" })).country_other).toBeTruthy();
    expect(validateStep(0, draft({ country: "Other", country_other: "Monaco", whatsapp_number: "+37761234567" }))).toEqual({});
  });

  it("requires goal, level, format, frequency, package, and payment on their steps", () => {
    expect(Object.keys(validateStep(1, emptyDraft())).sort()).toEqual(["primary_learning_goal", "self_reported_level"]);
    expect(Object.keys(validateStep(2, emptyDraft())).sort()).toEqual(["lesson_format", "preferred_classes_per_week", "selected_package"]);
    expect(Object.keys(validateStep(3, emptyDraft()))).toEqual(["preferred_payment_method"]);
  });

  it("requires text when 'Other' is a goal", () => {
    expect(validateStep(1, draft({ primary_learning_goal: "other" })).other_goal_text).toBeTruthy();
    expect(validateStep(1, draft({ additional_learning_goals: ["other"] })).other_goal_text).toBeTruthy();
    expect(validateStep(1, draft({ primary_learning_goal: "other", other_goal_text: "Medical English" }))).toEqual({});
  });
});

describe("email and phone validation", () => {
  it("validates email format", () => {
    expect(validateStep(0, draft({ email: "not-an-email" })).email).toBeTruthy();
    expect(validateStep(0, draft({ email: "  a.b@c.co " })).email).toBeUndefined();
  });

  it("normalises Egyptian and international numbers to E.164", () => {
    expect(normalizePhone("010 1234 5678", "Egypt")).toBe("+201012345678");
    expect(normalizePhone("+20 10 1234 5678", "Egypt")).toBe("+201012345678");
    expect(normalizePhone("+20 010 1234 5678", "Egypt")).toBe("+201012345678");
    expect(normalizePhone("00201012345678", "Germany")).toBe("+201012345678");
    expect(normalizePhone("(571) 326-5041", "United States")).toBe("+15713265041");
    expect(normalizePhone("07700 900123", "United Kingdom")).toBe("+447700900123");
    expect(normalizePhone("612345678", "Other")).toBeNull();
    expect(normalizePhone("+12", "Egypt")).toBeNull();
  });

  it("checks Egyptian mobile prefixes for WhatsApp", () => {
    expect(checkPhone("0131234567", "Egypt", { mobile: true }).ok).toBe(false);
    expect(checkPhone("01512345678", "Egypt", { mobile: true }).ok).toBe(true);
    expect(validateStep(0, draft({ whatsapp_number: "12345" })).whatsapp_number).toBeTruthy();
    expect(validateStep(0, draft({ alternative_phone: "abc" })).alternative_phone).toBeTruthy();
  });
});

describe("lesson format, frequency, and package", () => {
  it("keeps group packages for small groups only", () => {
    expect(packageFitsFormat("group-8", "small_group")).toBe(true);
    expect(packageFitsFormat("student-8", "small_group")).toBe(false);
    expect(packageFitsFormat("group-8", "one_on_one")).toBe(false);
    expect(packageFitsFormat("business-12", "not_sure")).toBe(true);
    expect(packageFitsFormat("trial", "small_group")).toBe(true);
    expect(validateStep(2, draft({ lesson_format: "one_on_one" })).selected_package).toMatch(/does not match/);
  });

  it("rejects unknown package ids", () => {
    expect(validateStep(2, draft({ selected_package: "vip-99" })).selected_package).toBeTruthy();
  });

  it("explains when weekly frequency is too low for a package's 30-day validity", () => {
    expect(frequencyPackageNote("student-8", "1")).toMatch(/about 2 lessons per week/);
    expect(frequencyPackageNote("student-12", "2")).toMatch(/about 3 lessons per week/);
    expect(frequencyPackageNote("student-12", "3")).toBeNull();
    expect(frequencyPackageNote("student-single", "1")).toBeNull();
    expect(frequencyPackageNote("student-8", "flexible")).toBeNull();
    expect(reviewFlagsFor({ ...draft({ selected_package: "student-8", lesson_format: "one_on_one", preferred_classes_per_week: "1" }) })).toContain(
      "frequency_package_mismatch",
    );
  });
});

describe("location-based packages", () => {
  const ksa = { country: "Saudi Arabia", city: "Riyadh", whatsapp_number: "+966 50 123 4567", lesson_format: "one_on_one", group_status: "" };

  it("offers Cairo prices only to students in Cairo", () => {
    expect(validateStep(2, draft({ city: "Giza" })).selected_package).toMatch(/Cairo prices are for students in Cairo/);
    const r = parseApplication(draft({ city: "Alexandria" }));
    expect(r.ok).toBe(false);
    expect(r.errors?.selected_package).toMatch(/Cairo prices/);
    expect(parseApplication(draft({ city: "Alexandria", selected_package: "help" })).ok).toBe(true);
    expect(parseApplication(draft({ city: "Giza", selected_package: "trial" })).ok).toBe(false);
  });

  it("accepts a location's own plans and rejects another location's", () => {
    expect(validateStep(2, draft({ ...ksa, selected_package: "ksa-monthly-3" }))).toEqual({});
    expect(parseApplication(draft({ ...ksa, selected_package: "ksa-monthly-5" })).ok).toBe(true);
    expect(validateStep(2, draft({ ...ksa, selected_package: "us-monthly-3" })).selected_package).toMatch(/United States/);
    expect(validateStep(2, draft({ ...ksa, selected_package: "student-8", is_student: true })).selected_package).toMatch(/in Cairo/);
    expect(parseApplication(draft({ ...ksa, selected_package: "uk-single" })).ok).toBe(false);
  });

  it("flags applications from locations without published prices for a quote", () => {
    const base = { ...draft(), additional_learning_goals: [] as string[] };
    expect(reviewFlagsFor({ ...base, country: "Egypt", city: "Giza", selected_package: "help" })).toContain("pricing_quote_needed");
    expect(reviewFlagsFor({ ...base, country: "Germany", city: "Berlin", selected_package: "help" })).toContain("pricing_quote_needed");
    expect(reviewFlagsFor({ ...base, country: "Egypt", city: "Cairo" })).not.toContain("pricing_quote_needed");
    expect(reviewFlagsFor({ ...base, country: "Saudi Arabia", city: "Riyadh" })).not.toContain("pricing_quote_needed");
  });

  it("compares weekly frequency with a monthly plan's schedule", () => {
    expect(frequencyPackageNote("us-monthly-3", "2")).toMatch(/includes 3 classes per week \(12 in 4 weeks\)/);
    expect(frequencyPackageNote("us-monthly-3", "3")).toBeNull();
    expect(frequencyPackageNote("ksa-monthly-5", "3")).toMatch(/5 classes per week/);
    expect(frequencyPackageNote("ksa-monthly-5", "4_plus")).toBeNull();
    expect(frequencyPackageNote("ksa-single", "1")).toBeNull();
  });
});

describe("payment method", () => {
  it("offers Vodafone Cash only in Egypt or for +20 numbers", () => {
    expect(paymentMethodsFor("Egypt", null).map((m) => m.value)).toContain("vodafone_cash");
    expect(paymentMethodsFor("Saudi Arabia", "+201012345678").map((m) => m.value)).toContain("vodafone_cash");
    expect(paymentMethodsFor("Germany", "+4915112345678").map((m) => m.value)).not.toContain("vodafone_cash");
  });

  it("validates the payment choice", () => {
    expect(validateStep(3, draft({ preferred_payment_method: "bitcoin" })).preferred_payment_method).toBeTruthy();
    expect(validateStep(3, draft({ preferred_payment_method: "wise" }))).toEqual({});
  });
});

describe("parseApplication", () => {
  it("normalises a full application and strips control characters", () => {
    const r = parseApplication(draft({ full_name: "  Karim\u0007  Hassan ", learning_goal_details: "Line 1\n\n\n\nLine 2" }));
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.full_name).toBe("Karim Hassan");
      expect(r.data.learning_goal_details).toBe("Line 1\n\nLine 2");
      expect(r.data.whatsapp_number).toBe("+201112345678");
      expect(r.data.alternative_phone).toBeNull();
    }
  });

  it("drops the primary goal from additional goals and enforces length limits", () => {
    const r = parseApplication(draft({ additional_learning_goals: ["general", "travel", "travel"] }));
    expect(r.ok && r.data.additional_learning_goals).toEqual(["travel"]);
    expect(parseApplication(draft({ full_name: "x".repeat(101) })).ok).toBe(false);
  });

  it("requires group status only for small groups and drops it otherwise", () => {
    expect(validateStep(2, draft({ group_status: "" })).group_status).toBeTruthy();
    expect(validateStep(2, draft({ group_status: "bogus" })).group_status).toBeTruthy();
    const oneToOne = parseApplication(draft({ lesson_format: "one_on_one", selected_package: "student-8", is_student: true, group_status: "has_group" }));
    expect(oneToOne.ok && oneToOne.data.group_status).toBeNull();
    const group = parseApplication(draft({ group_status: "needs_group" }));
    expect(group.ok && group.data.group_status).toBe("needs_group");
  });

  it("allows Student English packages only to people who say they are a student", () => {
    const pkg = { lesson_format: "one_on_one", selected_package: "student-8", group_status: "" };
    expect(validateStep(2, draft(pkg)).selected_package).toBe(STUDENT_PACKAGE_ERROR);
    expect(parseApplication(draft(pkg)).errors?.selected_package).toBe(STUDENT_PACKAGE_ERROR);
    const ok = parseApplication(draft({ ...pkg, is_student: true }));
    expect(ok.ok && ok.data.is_student).toBe(true);
    const other = parseApplication(draft({ ...pkg, selected_package: "professional-8" }));
    expect(other.ok && other.data.is_student).toBe(false);
    expect(parseApplication(draft({ ...pkg, is_student: "yes" as never })).ok).toBe(false);
  });

  it("suggests Professional English for general goals unless the person is a student", () => {
    expect(suggestedTrackForGoal("general")).toBe("professional");
    expect(suggestedTrackForGoal("academic")).toBe("professional");
    expect(suggestedTrackForGoal("business")).toBe("business");
    expect(suggestedTrackForGoal("general", true)).toBe("student");
    expect(suggestedTrackForGoal("business", true)).toBe("student");
  });

  it("rejects non-object input", () => {
    expect(parseApplication(null).ok).toBe(false);
    expect(parseApplication([]).ok).toBe(false);
  });
});

describe("parseContactCorrection", () => {
  const base = { full_name: "Karim Hassan", email: "K@Example.com", whatsapp_number: "01112345678", alternative_phone: "", country: "Egypt", city: "Giza" };
  it("normalises valid corrections", () => {
    const r = parseContactCorrection(base);
    expect(r.ok && r.data).toEqual({ ...base, email: "k@example.com", whatsapp_number: "+201112345678", alternative_phone: null });
  });
  it("rejects invalid email and phone numbers", () => {
    expect(parseContactCorrection({ ...base, email: "nope" }).errors?.email).toBeTruthy();
    expect(parseContactCorrection({ ...base, whatsapp_number: "123" }).errors?.whatsapp_number).toBeTruthy();
    expect(parseContactCorrection({ ...base, alternative_phone: "abc" }).errors?.alternative_phone).toBeTruthy();
    expect(parseContactCorrection("x").ok).toBe(false);
  });
});
