# Security Specification - Church Visitor Portal

## Data Invariants
- A visitor record must contain a valid name, phone, and address.
- A visitor record must include the creator's UID and a server-side timestamp.
- Only authenticated users can register visitors.
- Users can only read the list of visitors if they are authenticated.

## The Dirty Dozen Payloads

1. **Anonymous Write**: Attempt to create a visitor without being logged in.
2. **Missing Fields**: Attempt to create a visitor without a phone number.
3. **Invalid ID**: Attempt to use a 2MB string as a document ID.
4. **Spoofed Creator**: Attempt to create a visitor with a `createdBy` field that doesn't match the user's UID.
5. **Future Timestamp**: Attempt to set a `createdAt` timestamp in the future.
6. **Shadow Field Injection**: Attempt to add `isAdmin: true` to a visitor document.
7. **Bypassing Validation**: Attempt to register a visitor with an empty string for the name.
8. **Unauthorized Metadata Update**: Attempt to change the `createdBy` field of an existing record.
9. **Identity Spoofing**: Attempt to update a record owned by someone else (if ownership was restricted, though here it's shared by authenticated staff).
10. **Malicious Query**: Attempt to read the entire visitors collection without being logged in.
11. **Resource Exhaustion**: Attempt to send a 1MB string in the name field.
12. **Status Shortcut**: Attempt to set a terminal status if we had one (not applicable here, but good to keep in mind).

## Red Team Evaluation

| Collection | Identity Spoofing | State Shortcutting | Resource Poisoning |
| :--- | :--- | :--- | :--- |
| `visitors` | Protected by `request.auth.uid` check | N/A | Protected by `.size()` checks |
