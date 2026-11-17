import { Request, Response } from 'express';
import { OrganizationService } from '../services/organization.service';
import { sendSuccess } from '../utils/apiResponse';
import { asyncHandler } from '../utils/asyncHandler';

export class OrganizationController {
  static listBranches = asyncHandler(async (req: Request, res: Response) => {
    const branches = await OrganizationService.listBranches(req.branchContext!);
    return sendSuccess(res, branches, 'Danh sách Chi nhánh (HQ Hub & Nhà xưởng)');
  });

  static createBranch = asyncHandler(async (req: Request, res: Response) => {
    const branch = await OrganizationService.createBranch(req.user!, req.body, req.ip);
    return sendSuccess(res, branch, 'Tạo Chi nhánh mới thành công', 201);
  });

  static listDepartments = asyncHandler(async (req: Request, res: Response) => {
    const departments = await OrganizationService.listDepartments(
      req.branchContext!,
      req.query.branchId as string | undefined
    );
    return sendSuccess(res, departments, 'Danh sách Phòng ban');
  });

  static createDepartment = asyncHandler(async (req: Request, res: Response) => {
    const dept = await OrganizationService.createDepartment(
      req.user!,
      req.branchContext!,
      req.body,
      req.ip
    );
    return sendSuccess(res, dept, 'Tạo Phòng ban mới thành công', 201);
  });

  static listProductionTeams = asyncHandler(async (req: Request, res: Response) => {
    const teams = await OrganizationService.listProductionTeams(req.branchContext!, {
      branchId: req.query.branchId as string | undefined,
      departmentId: req.query.departmentId as string | undefined,
    });
    return sendSuccess(res, teams, 'Danh sách Tổ / Chuyền sản xuất');
  });

  static createProductionTeam = asyncHandler(async (req: Request, res: Response) => {
    const team = await OrganizationService.createProductionTeam(
      req.user!,
      req.branchContext!,
      req.body,
      req.ip
    );
    return sendSuccess(res, team, 'Tạo Tổ / Chuyền sản xuất thành công', 201);
  });
}
