# Student Hub – ERD

## Core

- profiles
- organizations
- organization_members
- classes
- class_students

## Relações

profiles 1:N organization_members

organizations 1:N organization_members

organizations 1:N classes

classes N:N profiles (via class_students)