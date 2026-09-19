# Decisão 002

Assinaturas serão modeladas em uma tabela `plans`.

organizations possuirá apenas `plan_id`.

Limites e recursos serão validados no backend (Server Actions), não em RLS.

plans
-----
id
name
max_students
max_storage_mb
max_instructors
price

organizations
-------------
id
plan_id

organization_usage   -- cache opcional
------------------
organization_id
storage_bytes
students_count