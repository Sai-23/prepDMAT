# General Academic student release gate

Student General Academic is disabled by default. Both `GENERAL_ACADEMIC_ENABLED` and `NEXT_PUBLIC_GENERAL_ACADEMIC_ENABLED` must be exactly `true` to enable it. A missing value is `false`. The server checks both variables for routes, data-loading entry points, and mutations; the public variable is not a security boundary.

For the current production release, set both variables to `false` in the Vercel **Production** environment and redeploy. Confirm neither is overridden by a production environment group or deployment-specific override. Leave Preview and Development false unless deliberately testing the module; set both to `true` there to exercise student GAM.

Disabled student URLs under `/practice/general-academic`, `/mock/general-academic`, and `/progress/general-academic` return 404, including their nested attempt, result, review, bookmark, mistake, and history URLs. GAM practice/mock/learning Server Actions return a safe unavailable error before touching student data. Core routes and actions do not consult this gate. Admin General Academic authoring remains subject to its existing role checks and is not gated.

The exam-format page can still describe the official exam's General Academic module; it has no student GAM launch link. The gate does not remove code, migrations, or existing data. To release GAM later, validate migrations and content in Preview, set both variables to `true` in Production, redeploy, and rerun the student route/action smoke checks.
