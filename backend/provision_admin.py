"""Explicit private administrator creation. No default account, reset or overwrite."""
import argparse
from getpass import getpass


def create_admin(db, email, password, full_name="Administrator"):
    from pydantic import EmailStr, TypeAdapter
    from app.core.security import hash_password
    from app.models import User
    from app.services.auth_service import get_or_create_role

    email = str(TypeAdapter(EmailStr).validate_python(email)).lower()
    if len(password) < 12 or not password.strip() or len(password.encode("utf-8")) > 72:
        raise ValueError("Use a private generated password of 12+ characters and at most 72 UTF-8 bytes")
    if not full_name.strip() or len(full_name) > 120:
        raise ValueError("Name must contain 1 to 120 characters")
    if db.query(User).filter(User.email == email).first():
        raise ValueError("Account already exists; refusing to change its password or roles")
    user = User(email=email, hashed_password=hash_password(password), full_name=full_name.strip(),
                phone="", avatar_url="", is_verified=False)
    user.roles = [get_or_create_role(db, role) for role in ("ADMIN", "USER")]
    db.add(user)
    db.commit()
    return user


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--create-admin", action="store_true", help="Explicitly create a new account in the configured database")
    args = parser.parse_args()
    if not args.create_admin:
        parser.error("Explicit --create-admin is required")
    print("This creates a NEW ADMIN in the privately configured database. Run reviewed migrations first.")
    if input("Type CREATE ADMIN to continue: ") != "CREATE ADMIN":
        parser.error("Cancelled without changing data")
    email = input("Private administrator email: ").strip()
    full_name = input("Display name: ").strip()
    password = getpass("Private generated password (hidden): ")
    if getpass("Repeat password (hidden): ") != password:
        parser.error("Passwords do not match; no data changed")
    from app.database import SessionLocal
    with SessionLocal() as db:
        try:
            create_admin(db, email, password, full_name)
        except ValueError:
            db.rollback()
            parser.error("Invalid input or existing account; no existing account was changed")
    print("Created one administrator. No credentials are printed or saved to a source file.")


if __name__ == "__main__":
    main()
