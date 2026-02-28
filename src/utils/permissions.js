export const permissions = {
    student: [
        "VIEW_COURSE",
        "ENROLL_COURSE",
        "VIEW_ASSIGNMENT",
        "SUBMIT_ASSIGNMENT"
    ],
    instructor: [
        "CREATE_COURSE",
        "EDIT_COURSE",
        "DELETE_COURSE",
        "VIEW_COURSE",
        "CREATE_ASSIGNMENT",
        "GRADE_ASSIGNMENT"
    ],
    admin: [
        "MANAGE_USERS",
        "DELETE_COURSE",
        "ALL" // full access
    ]
};
