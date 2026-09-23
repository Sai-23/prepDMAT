# General Academic student release gate

Student General Academic is disabled by default. `GENERAL_ACADEMIC_ENABLED=true` enables server routes and mutations. Student UI links and cards require both that server flag and `NEXT_PUBLIC_GENERAL_ACADEMIC_ENABLED=true`; the public flag alone can never expose the module. Any other or missing value is treated as `false`. The server flag is the security boundary; the public flag is UI only. These narrow fail-closed checks deliberately do not load or validate unrelated application environment variables.

For the current production release, set both variables to `false` in the Vercel **Production** environment and redeploy. Confirm neither is overridden by a production environment group or deployment-specific override. Leave Preview and Development false unless deliberately testing the module; set both to `true` there to exercise student GAM.

Disabled student URLs under `/practice/general-academic`, `/mock/general-academic`, and `/progress/general-academic` return 404, including their nested attempt, result, review, bookmark, mistake, and history URLs. GAM practice/mock/learning Server Actions return a safe unavailable error before touching student data. Core routes and actions do not consult this gate. Admin General Academic authoring remains subject to its existing role checks and is not gated.

The exam-format page can still describe the official exam's General Academic module; it has no student GAM launch link. The gate does not remove code, migrations, or existing data. To release GAM later, validate migrations and content in Preview, set both variables to `true` in Production, redeploy, and rerun the student route/action smoke checks.
