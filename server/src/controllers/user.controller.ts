import { Request, Response } from 'express';
import { AuditService } from '../services/audit.service';
import { UserService } from '../services/user.service';
import { sendSuccess } from '../utils/apiResponse';
import { asyncHandler } from '../utils/asyncHandler';

export class UserController {
  static getRbacMatrix = asyncHandler(async (_req: Request, res: Response) => {
    const matrix = UserService.getRbacMatrix();
    return sendSuccess(res, matrix, 'Danh mục Ma trận Phân quyền (RBAC & Branch Scope)');
  });

  static listUsers = asyncHandler(async (req: Request, res: Response) => {
    const result = await UserService.listUsers(req.branchContext!, req.query as Record<string, string>);
    return sendSuccess(res, result.items, 'Danh sách tài khoản người dùng', 200, result.meta);
  });

  static getUserById = asyncHandler(async (req: Request, res: Response) => {
    const user = await UserService.getUserById(req.params.id as string, req.branchContext!);
    return sendSuccess(res, user, 'Chi tiết tài khoản người dùng');
  });

  static createUser = asyncHandler(async (req: Request, res: Response) => {
    const created = await UserService.createUser(
      req.user!,
      req.branchContext!,
      req.body,
      req.ip
    );
    return sendSuccess(res, created, 'Tạo tài khoản mới thành công', 201);
  });

  static updateUser = asyncHandler(async (req: Request, res: Response) => {
    const updated = await UserService.updateUser(
      req.user!,
      req.branchContext!,
      req.params.id as string,
      req.body,
      req.ip
    );
    return sendSuccess(res, updated, 'Cập nhật tài khoản thành công');
  });

  static updateUserPermissions = asyncHandler(async (req: Request, res: Response) => {
    const updated = await UserService.updateUserPermissions(
      req.user!,
      req.branchContext!,
      req.params.id as string,
      req.body,
      req.ip
    );
    return sendSuccess(res, updated, 'Cập nhật phân quyền RBAC & Chi nhánh thành công');
  });

  static listAuditLogs = asyncHandler(async (req: Request, res: Response) => {
    const result = await AuditService.listAuditLogs(
      req.branchContext!,
      req.query as Record<string, string>
    );
    return sendSuccess(res, result.items, 'Nhật ký thao tác hệ thống', 200, result.meta);
  });
}
