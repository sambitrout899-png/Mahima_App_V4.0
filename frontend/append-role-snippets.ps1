# append-role-snippets.ps1
# Safely appends role-related snippets and instructions to the end of a React Page.jsx file.
# This script DOES NOT modify your code in-place except for appending a helpful block at the end.
# You will manually paste the snippets into the places the comments indicate.
param()

function Read-Default($prompt, $default) {
    $line = Read-Host "$prompt [$default]"
    if ([string]::IsNullOrWhiteSpace($line)) { return $default } else { return $line }
}

Write-Host "=== Append Role Snippets Script ===" -ForegroundColor Cyan

$defaultPath = "C:\projects\frontend\src\pages\Users\Page.jsx"
$path = Read-Default "Path to your Page.jsx (or .csx) file" $defaultPath

if (-not (Test-Path $path)) {
    Write-Host "File not found: $path" -ForegroundColor Red
    $try = Read-Host "Enter a different path or press Enter to abort"
    if ([string]::IsNullOrWhiteSpace($try)) { Write-Host "Aborted."; exit 1 }
    $path = $try
    if (-not (Test-Path $path)) { Write-Host "Still not found. Aborting."; exit 1 }
}

# Backup
$timestamp = (Get-Date).ToString('yyyyMMddHHmmss')
$backup = "$path.bak.$timestamp"
Copy-Item -Path $path -Destination $backup -Force
Write-Host "Backed up original to: $backup" -ForegroundColor Green

# Prepare appended block (clear instructions + code snippets)
$append = @'
/* ----------------- ROLE DROPDOWN SNIPPETS (APPENDED BY SCRIPT) -----------------
   This block was appended automatically to help you add a Role dropdown to the modal.

   STEPS:
   1) Open your Page.jsx and locate:
        - the top area where you declare useState hooks (look for other "const [foo, setFoo] = useState(...)").
        - the modal form (where Display name, Username, Email inputs live).
        - the functions that open the modal for "create" and "edit" (often named openCreate / openEdit).
        - the table header / row rendering where users are displayed.

   2) Copy the small snippets below and paste them exactly where indicated by the comments in each snippet.
      After pasting, save and restart your frontend dev server (npm run dev / yarn dev).

   3) Verify:
      - When you click "Add" the Role select defaults to "member".
      - When you click "Edit" the Role select shows the user's role.
      - After Save the table displays the updated role (backend already returns role).

   SNIPPETS (copy-paste the sections you need)
   ------------------------------------------------------------------------------

   A) roles useState (paste near other useState declarations)
   ------------------------------------------------------------------------------

   // roles dropdown values (added)
   const [roles, setRoles] = useState(["member", "admin", "leader"]);
   // If you prefer, fetch roles from server using useEffect:
   // useEffect(() => { (async () => {
   //   try { const res = await fetch(`${API_BASE}/api/roles`); if (res.ok) setRoles(await res.json()); } catch(e){console.warn(e)}
   // })(); }, []);

   ------------------------------------------------------------------------------

   B) openCreate example (paste into the function that opens the modal for creating a user)
   ------------------------------------------------------------------------------

   // openCreate example — sets a sensible default role
   const openCreate = () => {
     setForm({
       displayName: "",
       username: "",
       email: "",
       role: "member",   // default role
       joinDate: "",
       lastLogin: null,
       teams: null
     });
     setShowModal(true);
   };

   ------------------------------------------------------------------------------

   C) openEdit snippet (ensure role is present when editing)
   ------------------------------------------------------------------------------

   // When editing, ensure form includes role fallback
   const openEdit = (user) => {
     setForm({
       ...user,
       role: user.role ?? ""
     });
     setShowModal(true);
   };

   ------------------------------------------------------------------------------

   D) Modal Role select (copy this block and paste it into your modal form near the email/username inputs)
   ------------------------------------------------------------------------------

   {/* Role */}
   <div className="form-group" style={{ marginBottom: 10 }}>
     <label htmlFor="roleSelect" style={{ display: "block", marginBottom: 6 }}>Role</label>
     <select
       id="roleSelect"
       name="role"
       className="form-control"
       value={form.role ?? ""}
       onChange={(e) => setForm(prev => ({ ...prev, role: e.target.value }))}
       aria-label="Role"
       style={{ width: "100%", padding: 8 }}
     >
       <option value="">-- select role --</option>
       {roles.map(r =>
         typeof r === "string" ? (
           <option key={r} value={r}>{r}</option>
         ) : (
           <option key={r.value} value={r.value}>{r.label}</option>
         )
       )}
     </select>
   </div>

   NOTES:
    - className="form-control" is Bootstrap; replace with your styling if needed.
    - The select includes id and name attributes to help browser autofill.

   ------------------------------------------------------------------------------

   E) Table header & cell examples (paste header into <thead> row and the <td> into each row)
   ------------------------------------------------------------------------------

   // Header: add this into your table header row
   <th style={{ textAlign: "left", padding: 8 }}>role</th>

   // Row cell: add inside your rows (where other <td> are rendered)
   <td style={{ padding: 12 }}>{u.role ?? ""}</td>

   ------------------------------------------------------------------------------

   QUICK TROUBLESHOOTING:
    - If the select does not show a value on edit: verify `openEdit` sets the form with `role`.
    - If Save does not update role: verify your Request Payload (DevTools Network) includes "role".
    - If the table still shows old values after Save: ensure your client re-fetches the list or merges the update into state.

   After you finish pasting, restart the frontend dev server and test the flow.

   ------------------------------------------------------------------------------
   End of appended helper block.
*/
'@

# Append to file
Add-Content -Path $path -Value $append -Encoding UTF8
Write-Host "Appended role snippets and instructions to the end of the file." -ForegroundColor Green

Write-Host ""
Write-Host "DONE. Please open the file and paste the relevant snippets into the places indicated."
Write-Host "Backup created at: $backup" -ForegroundColor Cyan
