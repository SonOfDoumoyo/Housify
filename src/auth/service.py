from sqlalchemy.ext.asyncio import AsyncSession
from models import SignUpModel,LoginModel
from database.schemas import User,Roles
from utils import hash_password
import re

email_pattern = re.compile(r'(\w+)@([a-z]+)\.([a-z]{3})') #adamslucy@gmail.com

class UserService:
    async def create_user(signup_info:SignUpModel,session:AsyncSession):
        signup_data = signup_info.model_dump()
        new_user = User(**signup_data)
        password_hash = await hash_password(signup_info.password)
        new_user.password_hash = password_hash
        if signup_info.agent:
            new_user.role = Roles.agent
        session.add(new_user)
        await session.commit()
        return new_user
    
    async def login(login_info:LoginModel,session:AsyncSession):
         



