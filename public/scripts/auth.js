import { getAuth, createUserWithEmailAndPassword, signOut, signInWithEmailAndPassword, 
    onAuthStateChanged, updateProfile, sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-auth.js";
import { setupUI, clearSettingsData } from "./index.js";

const auth = getAuth();

export function getUsersName() {
    
    if (auth.currentUser == null)
        return null;

    return auth.currentUser.displayName;
}

export async function isAdmin() {
    var idToken = await auth.currentUser.getIdTokenResult();
    return idToken.claims.admin;
}

export async function isVerified() {
    var idToken = await auth.currentUser.getIdTokenResult();
    return idToken.claims.verifiedEmployee;
}

// Listen for auth status changes
onAuthStateChanged(auth, user => {
    // If user is logged in
    if (user) {
        isAdmin().then(admin => {
            isVerified().then(verified => {
                setupUI(user, admin, verified);
            });
        });
        
    }
    // User logged out
    else {
        setupUI();
    }
    
});


// Register
const registerForm = document.querySelector("#register-form");
registerForm.addEventListener('submit', (e) => {
    // Prevent modal from closing on submit
    e.preventDefault();

    // Get user info
    let name = registerForm['register-name'].value;
    let email = registerForm['register-email'].value;
    let password = registerForm['register-password'].value;

    // Register user in firebase
    createUserWithEmailAndPassword(auth, email, password)
    .then(cred => {
        // Set user's display name
        updateProfile(auth.currentUser, {
            displayName: name
        }).then(function() {
            // Close registration modal and reset form
            const modal = document.querySelector("#modal-register");
            M.Modal.getInstance(modal).close();
            registerForm.reset();
        })
        .catch(error => {
            alert("Unable to add user's display name");
        });
    })
    .catch(error => {
        if (error.code === "auth/email-already-in-use") {
            alert("The email provided already belongs to an account");
        }
        else if (error.code === "auth/weak-password") {
            alert("Password must be at least 6 characters long");
        }
        else {
            alert("There was an error registering this account");
            console.error(error);
        }
    });
});


// Logout
const logout = document.querySelector("#logout");
logout.addEventListener('click', (e) => {
    e.preventDefault();
    signOut(auth).then(()=> {
        clearSettingsData();
    })
    .catch(error => {
        alert("Error logging out user");
        console.log(error);
    });
});



// Login
const loginForm = document.querySelector("#login-form");
loginForm.addEventListener('submit', (e) => {
    // Prevent modal from closing
    e.preventDefault();

    // Get user info
    const email = loginForm['login-email'].value;
    const password = loginForm['login-password'].value;

    signInWithEmailAndPassword(auth, email, password).then(cred => {
        // Close login modal and reset form
        const modal = document.querySelector("#modal-login");
        M.Modal.getInstance(modal).close();
        loginForm.reset();
    })
    .catch(error => {
        if (error.code === "auth/wrong-password") {
            alert("Incorrect password");
        }
        else if (error.code === "auth/user-not-found") {
            alert(`No user exists with the email ${email}`);
        }
        else if (error.code === "auth/weak-password") {
            alert("Password must be at least 6 characters long");
        }
        else {
            alert("There was an error logging in this account");
            console.error(error);
        }
    });
});


// Reset password
const passwordResetButton = document.querySelector("#reset-password-button");
passwordResetButton.addEventListener('click', e => {

    // Get entered email
    var emailInputField = document.getElementById("password-reset-email");
    const email = emailInputField.value;

    // Send password reset email
    sendPasswordResetEmail(auth, email)
    .then(() => {
        // Password reset email sent
        alert("Password reset email sent!");

        // Close password reset modal
        var passwordResetModalElement = document.getElementById("modal-password-reset");
        var passwordResetModal = M.Modal.getInstance(passwordResetModalElement);
        passwordResetModal.close();
    })
    .catch((error) => {
        console.error(error);
        alert("There was an error sending the password reset email.");
    });
});
