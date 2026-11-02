# W1 · 测井曲线智能分层

This package follows the existing M2 MUDLOGGING lesson template. The parent owns the only three tabs; these documents do not add a second tab or case navigation.

- Background: demo/background.html
- Workflow: demo/workflow.html (01 / 02 / 03 traditional / 03 AI / 04 / 05)
- Runnable demonstration: demo/identify.html (method / why / effects)

Parent routes:

- #/scene/w1?case=welllog-layer&tab=bg
- #/scene/w1?case=welllog-layer&tab=flow
- #/scene/w1?case=welllog-layer&tab=demo

Build: node tools/build-welllog-case-pages.cjs

Shared template: ../../m2-gas-case/assets/lesson.css. Package assets/case.css only adapts the numerical SVG views.
Input, frozen models, provenance and inference: ../../assets/welllog/{content,data,models,core,lessons}.js.
No retraining or data transformation occurs during this build. Data and labels remain synthetic teaching records.

Frame protocol: field-pages-v2. On initial load the document announces its own body data-section with __lessonSection, then requests shared state. __lessonSharedState restores the source ID and numerical controls; edits publish __lessonStateUpdate. __lessonNavigate asks the outer tab set to navigate. __lessonHeight resizes the same sandboxed iframe used by M2. Both __lessonScrollToTop and __m1ScrollToTop are honored.
Direct standalone navigation carries the state in #experiment= so the three fixed documents share the same input without browser storage.

Model SHA-256: 7679fb8d456bca9a82909ef4d165729e9de1fc05d9dc91cca8207225a0b05bee
