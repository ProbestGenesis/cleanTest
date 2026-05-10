import { createAccessControl } from "better-auth/plugins/access";
import { defaultStatements, adminAc, userAc } from "better-auth/plugins/admin/access";

const statement = {
    ...defaultStatements, 
    project: ["admin", "superadmin", "user"],
} as const;

export const ac = createAccessControl(statement);

export const admin = ac.newRole({
    project: ["admin", "superadmin"],
    ...adminAc.statements, 
});

export const superadmin = ac.newRole({
    project: ["admin", "superadmin", "user"],
    ...adminAc.statements,
});

export const assistant_administratif = ac.newRole({
    project: ["admin", "superadmin"], // Can access admin projects
    ...adminAc.statements, // Full admin statements for now
});

export const charger_inventaire = ac.newRole({
    project: ["user"], // Limited access
    // Add specific statements for inventory later if needed
});

export const user = ac.newRole({
    project: ["user"],
    ...userAc.statements
})
