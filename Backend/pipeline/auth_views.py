"""
Authentication views for the fraud detection pipeline.

Endpoints:
  POST /api/auth/login   — Authenticate and return token
  POST /api/auth/logout  — Invalidate token
  GET  /api/auth/me      — Current user info
"""

from django.contrib.auth import authenticate
from rest_framework import status
from rest_framework.authtoken.models import Token
from rest_framework.decorators import api_view, permission_classes, authentication_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response


@api_view(['POST'])
@authentication_classes([])
@permission_classes([AllowAny])
def login_view(request):
    """
    POST /api/auth/login
    Body: { "username": "...", "password": "..." }
    Returns: { "token": "...", "user": { "id", "username", "email", "role", "is_staff" } }
    """
    username = request.data.get('username', '').strip()
    password = request.data.get('password', '')

    if not username or not password:
        return Response(
            {'error': 'Username and password are required.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    user = authenticate(username=username, password=password)

    if user is None:
        return Response(
            {'error': 'Invalid credentials. Please check your username and password.'},
            status=status.HTTP_401_UNAUTHORIZED,
        )

    if not user.is_active:
        return Response(
            {'error': 'This account has been deactivated.'},
            status=status.HTTP_403_FORBIDDEN,
        )

    # Create or get existing token
    token, _ = Token.objects.get_or_create(user=user)

    return Response({
        'token': token.key,
        'user': {
            'id': user.id,
            'username': user.username,
            'email': user.email,
            'role': 'admin' if user.is_staff else 'analyst',
            'is_staff': user.is_staff,
        },
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def logout_view(request):
    """
    POST /api/auth/logout
    Deletes the user's auth token.
    """
    try:
        request.user.auth_token.delete()
    except Exception:
        pass

    return Response({'message': 'Logged out successfully.'})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def me_view(request):
    """
    GET /api/auth/me
    Returns current authenticated user info.
    """
    user = request.user
    return Response({
        'id': user.id,
        'username': user.username,
        'email': user.email,
        'role': 'admin' if user.is_staff else 'analyst',
        'is_staff': user.is_staff,
    })
