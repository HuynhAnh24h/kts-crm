import { Request, Response } from 'express';
import { EmployeeService } from '../services/employee.service';
import { sendSuccess } from '../utils/apiResponse';
import { asyncHandler } from '../utils/asyncHandler';

export class EmployeeController {
  static listEmployees = asyncHandler(async (req: Request, res: Response) => {
    const result = await EmployeeService.listEmployees(
      req.user!,
      req.branchContext!,
      req.query as Record<string, string>
    );
    return sendSuccess(res, result.items, 'Danh sách hồ sơ nhân viên', 200, result.meta);
  });

  static getMyProfile = asyncHandler(async (req: Request, res: Response) => {
    const profile = await EmployeeService.getMyProfile(req.user!);
    return sendSuccess(res, profile, 'Hồ sơ nhân viên cá nhân');
  });

  static updateMyProfile = asyncHandler(async (req: Request, res: Response) => {
    const updated = await EmployeeService.updateMyProfile(req.user!, req.body, req.ip);
    return sendSuccess(res, updated, 'Cập nhật hồ sơ cá nhân thành công');
  });

  static getEmployeeById = asyncHandler(async (req: Request, res: Response) => {
    const employee = await EmployeeService.getEmployeeById(
      req.params.id as string,
      req.user!,
      req.branchContext!
    );
    return sendSuccess(res, employee, 'Chi tiết hồ sơ nhân viên');
  });

  static createEmployee = asyncHandler(async (req: Request, res: Response) => {
    const created = await EmployeeService.createEmployee(
      req.user!,
      req.branchContext!,
      req.body,
      req.ip
    );
    return sendSuccess(res, created, 'Tạo hồ sơ nhân viên thành công', 201);
  });

  static updateEmployee = asyncHandler(async (req: Request, res: Response) => {
    const updated = await EmployeeService.updateEmployee(
      req.user!,
      req.branchContext!,
      req.params.id as string,
      req.body,
      req.ip
    );
    return sendSuccess(res, updated, 'Cập nhật hồ sơ nhân viên thành công');
  });

  static addContract = asyncHandler(async (req: Request, res: Response) => {
    const contract = await EmployeeService.addEmployeeContract(
      req.user!,
      req.branchContext!,
      req.params.id as string,
      req.body,
      req.ip
    );
    return sendSuccess(res, contract, 'Tạo hợp đồng lao động thành công', 201);
  });
}
