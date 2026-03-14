python -m venv venv
venv\Scripts\activate

pip install fastapi uvicorn[standard] pydantic sqlalchemy databases python-dotenv
pip install mysqlclient sqlalchemy databases


uvicorn main:app --reload